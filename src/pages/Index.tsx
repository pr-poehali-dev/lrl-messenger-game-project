import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import Icon from "@/components/ui/icon";
import { VoiceChat } from "@/lib/voiceChat";
import { toast } from "sonner";

const CHAT_API = "https://functions.poehali.dev/8043795a-df28-43ad-aee5-df60e3707260";
const AUTH_API = "https://functions.poehali.dev/5472267d-fbd8-4c31-b0cc-0589e6b65ba2";
const VOICE_API = "https://functions.poehali.dev/e6fbfc6f-2e2c-411f-9639-bb2f73d0fd9c";
const MEMBERS_API = "https://functions.poehali.dev/7693979e-2693-4853-8810-416811336dc9";
const SCHEDULE_API = "https://functions.poehali.dev/1559ce35-681a-40a8-b477-47a554a8df9f";

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
  avatar: string;
}

interface Message {
  id: number;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  role?: string;
}

interface VoiceChannel {
  id: number;
  name: string;
  users: number;
  active?: boolean;
}

interface Member {
  id: number;
  name: string;
  role: string;
  status: "online" | "offline" | "busy";
  avatar: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [activeSection, setActiveSection] = useState<"chat" | "voice" | "members" | "schedule">("chat");
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [voiceChannels, setVoiceChannels] = useState<VoiceChannel[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [connectedChannel, setConnectedChannel] = useState<number | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [voiceChannelPeers, setVoiceChannelPeers] = useState<any[]>([]);
  const voiceChatRef = useRef<VoiceChat | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('lrl_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setShowAuth(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadMessages();
      loadVoiceChannels();
      loadMembers();
      loadSchedule();
      const interval = setInterval(() => {
        loadMessages();
        loadVoiceChannels();
        loadMembers();
        if (connectedChannel) {
          loadVoiceChannelPeers(connectedChannel);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user, connectedChannel]);

  const loadMessages = async () => {
    const response = await fetch(CHAT_API);
    const data = await response.json();
    setMessages(data.messages);
  };

  const loadVoiceChannels = async () => {
    const response = await fetch(`${VOICE_API}?action=list`);
    const data = await response.json();
    setVoiceChannels(data.channels.map((ch: any) => ({
      ...ch,
      active: ch.id === connectedChannel
    })));
  };

  const loadMembers = async () => {
    const response = await fetch(MEMBERS_API);
    const data = await response.json();
    setMembers(data.members);
  };

  const loadSchedule = async () => {
    const response = await fetch(SCHEDULE_API);
    const data = await response.json();
    setSchedule(data.schedule);
  };

  const loadVoiceChannelPeers = async (channelId: number) => {
    const response = await fetch(`${VOICE_API}?action=peers&channel_id=${channelId}`);
    const data = await response.json();
    setVoiceChannelPeers(data.peers || []);
  };

  const handleAuth = async () => {
    if (!username || !password) return;

    const body: any = {
      action: authMode,
      username,
      password
    };

    if (authMode === 'register') {
      body.display_name = displayName || username;
      body.role = 'Солдат';
    }

    const response = await fetch(AUTH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (response.ok) {
      setUser(data.user);
      localStorage.setItem('lrl_user', JSON.stringify(data.user));
      localStorage.setItem('lrl_token', data.token);
      setShowAuth(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('lrl_user');
    localStorage.removeItem('lrl_token');
    setShowAuth(true);
  };

  const handleVoiceChannelToggle = async (channelId: number) => {
    if (connectedChannel === channelId) {
      if (voiceChatRef.current) {
        await voiceChatRef.current.disconnect();
        voiceChatRef.current = null;
      }
      setConnectedChannel(null);
      toast.success('Отключено от голосового канала');
    } else {
      try {
        if (voiceChatRef.current) {
          await voiceChatRef.current.disconnect();
        }

        const voiceChat = new VoiceChat({
          channelId,
          userId: user!.id,
          apiUrl: VOICE_API,
          onPeerJoin: (peerId, name) => {
            toast.info(`${name} присоединился к каналу`);
          },
          onPeerLeave: (peerId) => {
            toast.info('Участник покинул канал');
            setSpeakingUsers(prev => {
              const next = new Set(prev);
              next.delete(peerId);
              return next;
            });
          },
          onSpeaking: (peerId, isSpeaking) => {
            setSpeakingUsers(prev => {
              const next = new Set(prev);
              if (isSpeaking) {
                next.add(peerId);
              } else {
                next.delete(peerId);
              }
              return next;
            });
          },
          onError: (error) => {
            toast.error(`Ошибка: ${error.message}`);
          }
        });

        await voiceChat.connect();
        voiceChatRef.current = voiceChat;
        setConnectedChannel(channelId);
        await loadVoiceChannelPeers(channelId);
        toast.success('Подключено к голосовому каналу');
      } catch (error) {
        toast.error('Не удалось подключиться к голосовому каналу');
        console.error(error);
      }
    }
  };

  const toggleMicrophone = () => {
    if (voiceChatRef.current) {
      const newMutedState = !isMicMuted;
      voiceChatRef.current.setMicrophoneEnabled(!newMutedState);
      setIsMicMuted(newMutedState);
      toast.info(newMutedState ? 'Микрофон выключен' : 'Микрофон включен');
    }
  };

  useEffect(() => {
    return () => {
      if (voiceChatRef.current) {
        voiceChatRef.current.disconnect();
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (messageInput.trim() && user) {
      await fetch(CHAT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: user.display_name,
          content: messageInput,
          role: user.role,
          avatar: user.avatar
        })
      });
      setMessageInput("");
      loadMessages();
    }
  };

  if (showAuth) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="w-full max-w-md p-8 bg-card border border-border military-corner">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary mx-auto mb-4 flex items-center justify-center military-corner">
              <span className="text-3xl">⚔️</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">LRL Regiment</h1>
            <p className="text-muted-foreground text-sm">Loyalists's Russian Legion</p>
          </div>

          <div className="space-y-4">
            <div>
              <Input
                placeholder="Имя пользователя"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="military-corner-small"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                className="military-corner-small"
              />
            </div>
            {authMode === 'register' && (
              <div>
                <Input
                  placeholder="Отображаемое имя"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="military-corner-small"
                />
              </div>
            )}
            <Button
              onClick={handleAuth}
              className="w-full military-corner-small"
            >
              {authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="w-full"
            >
              {authMode === 'login' ? 'Создать аккаунт' : 'Уже есть аккаунт'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary flex items-center justify-center military-corner">
              <span className="text-2xl">⚔️</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">LRL Regiment</h1>
              <p className="text-xs text-muted-foreground">Loyalists's Legion</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2">
          <Button
            variant={activeSection === "chat" ? "secondary" : "ghost"}
            className="w-full justify-start mb-1 military-corner-small"
            onClick={() => setActiveSection("chat")}
          >
            <Icon name="MessageSquare" className="mr-2" size={18} />
            Текстовые чаты
          </Button>

          <Button
            variant={activeSection === "voice" ? "secondary" : "ghost"}
            className="w-full justify-start mb-1 military-corner-small"
            onClick={() => setActiveSection("voice")}
          >
            <Icon name="Mic" className="mr-2" size={18} />
            Голосовые каналы
          </Button>

          <Button
            variant={activeSection === "members" ? "secondary" : "ghost"}
            className="w-full justify-start mb-1 military-corner-small"
            onClick={() => setActiveSection("members")}
          >
            <Icon name="Users" className="mr-2" size={18} />
            Участники полка
          </Button>

          <Button
            variant={activeSection === "schedule" ? "secondary" : "ghost"}
            className="w-full justify-start military-corner-small"
            onClick={() => setActiveSection("schedule")}
          >
            <Icon name="Calendar" className="mr-2" size={18} />
            Расписание
          </Button>
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border-2 border-accent">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>{user?.display_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.display_name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleLogout}>
              <Icon name="LogOut" size={16} />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        {activeSection === "chat" && (
          <>
            <header className="h-14 border-b border-border px-6 flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/20 flex items-center justify-center rounded military-corner-small">
                  <Icon name="Hash" size={16} className="text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Основной чат</h2>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost">
                  <Icon name="Bell" size={18} />
                </Button>
                <Button size="icon" variant="ghost">
                  <Icon name="Pin" size={18} />
                </Button>
                <Button size="icon" variant="ghost">
                  <Icon name="Search" size={18} />
                </Button>
              </div>
            </header>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Нет сообщений</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex gap-3 hover:bg-muted/50 p-2 rounded transition-colors">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={msg.avatar} />
                        <AvatarFallback>{msg.author[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">{msg.author}</span>
                          {msg.role && (
                            <Badge variant="secondary" className="text-xs military-corner-small bg-primary/20 text-primary border-primary/30">
                              {msg.role}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                        </div>
                        <p className="text-sm text-foreground/90">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="max-w-4xl mx-auto flex gap-2">
                <Button size="icon" variant="ghost" className="shrink-0">
                  <Icon name="Plus" size={20} />
                </Button>
                <Input
                  placeholder="Написать сообщение в #основной-чат..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 bg-input border-border"
                />
                <Button size="icon" variant="ghost" className="shrink-0">
                  <Icon name="Smile" size={20} />
                </Button>
              </div>
            </div>
          </>
        )}

        {activeSection === "voice" && (
          <>
            <header className="h-14 border-b border-border px-6 flex items-center bg-card">
              <Icon name="Mic" className="mr-3 text-primary" size={20} />
              <h2 className="text-lg font-semibold">Голосовые каналы</h2>
            </header>
            <div className="flex-1 p-6">
              <div className="max-w-2xl mx-auto">
                {voiceChannels.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Нет голосовых каналов</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {voiceChannels.map((channel) => (
                      <div
                        key={channel.id}
                        className="bg-card border border-border p-4 military-corner hover:border-primary/50 transition-all cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`relative w-10 h-10 rounded-full flex items-center justify-center ${channel.active ? 'bg-primary' : 'bg-muted'}`}>
                                <Icon name="Volume2" size={18} className={channel.active ? 'text-primary-foreground' : 'text-muted-foreground'} />
                                {channel.active && speakingUsers.size > 0 && (
                                  <div className="absolute -inset-1 rounded-full border-2 border-green-500 animate-pulse"></div>
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold">{channel.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {channel.users === 0 ? "Нет участников" : `${channel.users} участн.`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {channel.active && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMicrophone();
                                  }}
                                  className={`military-corner-small ${isMicMuted ? 'text-destructive' : ''}`}
                                >
                                  <Icon name={isMicMuted ? "MicOff" : "Mic"} size={16} />
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant={channel.active ? "destructive" : "secondary"} 
                                className="military-corner-small"
                                onClick={() => handleVoiceChannelToggle(channel.id)}
                              >
                                {channel.active ? "Выйти" : "Подключиться"}
                              </Button>
                            </div>
                          </div>
                          
                          {channel.active && voiceChannelPeers.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-xs text-muted-foreground mb-2">В канале:</p>
                              <div className="space-y-2">
                                {voiceChannelPeers.map((peer) => (
                                  <div key={peer.peer_id} className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6 border border-border">
                                      <AvatarImage src={peer.avatar} />
                                      <AvatarFallback className="text-xs">{peer.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{peer.name}</span>
                                    {speakingUsers.has(peer.peer_id) && (
                                      <div className="flex items-center gap-1 ml-auto">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                        <div className="w-1.5 h-2 bg-green-500 rounded-full animate-pulse animation-delay-100"></div>
                                        <div className="w-1.5 h-3 bg-green-500 rounded-full animate-pulse animation-delay-200"></div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                <div className="flex items-center gap-2 bg-primary/10 p-2 rounded military-corner-small">
                                  <Avatar className="h-6 w-6 border border-primary">
                                    <AvatarImage src={user?.avatar} />
                                    <AvatarFallback className="text-xs">{user?.display_name[0]}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-semibold">{user?.display_name} (вы)</span>
                                  {speakingUsers.has(voiceChatRef.current?.getConnectedPeers()[0] || '') && (
                                    <div className="flex items-center gap-1 ml-auto">
                                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                      <div className="w-1.5 h-2 bg-green-500 rounded-full animate-pulse animation-delay-100"></div>
                                      <div className="w-1.5 h-3 bg-green-500 rounded-full animate-pulse animation-delay-200"></div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeSection === "members" && (
          <>
            <header className="h-14 border-b border-border px-6 flex items-center bg-card">
              <Icon name="Users" className="mr-3 text-primary" size={20} />
              <h2 className="text-lg font-semibold">Участники полка</h2>
            </header>
            <div className="flex-1 p-6">
              <div className="max-w-3xl mx-auto">
                {members.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Нет участников</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="bg-card border border-border p-3 flex items-center gap-4 military-corner hover:border-primary/30 transition-all"
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12 border-2 border-border">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{member.name[0]}</AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${
                              member.status === "online"
                                ? "bg-green-500"
                                : member.status === "busy"
                                ? "bg-yellow-500"
                                : "bg-gray-500"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{member.name}</h3>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                        </div>
                        <Badge variant="outline" className="military-corner-small">
                          {member.status === "online" ? "В сети" : member.status === "busy" ? "Занят" : "Не в сети"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeSection === "schedule" && (
          <>
            <header className="h-14 border-b border-border px-6 flex items-center bg-card">
              <Icon name="Calendar" className="mr-3 text-primary" size={20} />
              <h2 className="text-lg font-semibold">Расписание тренировок и боев</h2>
            </header>
            <ScrollArea className="flex-1 p-6">
              <div className="max-w-4xl mx-auto">
                {schedule.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Нет событий в расписании</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                        🔴 <span>Важные Napoleonic Events (Приоритет)</span>
                      </h3>
                      <div className="space-y-2">
                        {schedule.filter(e => e.description === 'Important Napoleonic Events').map((event) => (
                          <div
                            key={event.id}
                            className="bg-card border border-primary/30 p-3 military-corner hover:border-primary/60 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-primary/20 text-primary px-3 py-2 military-corner-small text-center min-w-[100px]">
                                <div className="text-xs font-bold">{event.date}</div>
                                <div className="text-base font-bold">{event.time}</div>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold">{event.title}</h4>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                        🔴 <span>Важные Mod Events</span>
                      </h3>
                      <div className="space-y-2">
                        {schedule.filter(e => e.description === 'Important Mod Events').map((event) => (
                          <div
                            key={event.id}
                            className="bg-card border border-primary/30 p-3 military-corner hover:border-primary/60 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-primary/20 text-primary px-3 py-2 military-corner-small text-center min-w-[100px]">
                                <div className="text-xs font-bold">{event.date}</div>
                                <div className="text-base font-bold">{event.time}</div>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold">{event.title}</h4>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                        🟡 <span>Опциональные Napoleonic Events</span>
                      </h3>
                      <div className="space-y-2">
                        {schedule.filter(e => e.description === 'Optional Napoleonic Events').map((event) => (
                          <div
                            key={event.id}
                            className="bg-card border border-border p-3 military-corner hover:border-accent/50 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-accent/20 text-accent px-3 py-2 military-corner-small text-center min-w-[100px]">
                                <div className="text-xs font-bold">{event.date}</div>
                                <div className="text-base font-bold">{event.time}</div>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">{event.title}</h4>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                        🟡 <span>Опциональные Mod Events</span>
                      </h3>
                      <div className="space-y-2">
                        {schedule.filter(e => e.description === 'Optional Mod Events').map((event) => (
                          <div
                            key={event.id}
                            className="bg-card border border-border p-3 military-corner hover:border-accent/50 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-accent/20 text-accent px-3 py-2 military-corner-small text-center min-w-[100px]">
                                <div className="text-xs font-bold">{event.date}</div>
                                <div className="text-base font-bold">{event.time}</div>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">{event.title}</h4>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;