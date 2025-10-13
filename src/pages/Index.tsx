import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import Icon from "@/components/ui/icon";

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
  const [activeSection, setActiveSection] = useState<"chat" | "voice" | "members" | "schedule">("chat");
  const [messageInput, setMessageInput] = useState("");

  const messages: Message[] = [];

  const voiceChannels: VoiceChannel[] = [];

  const members: Member[] = [];

  const schedule = [];

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      setMessageInput("");
    }
  };

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
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback>ВЫ</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Рядовой Новобранец</p>
              <p className="text-xs text-muted-foreground truncate">Солдат</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Icon name="Settings" size={16} />
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${channel.active ? 'bg-primary' : 'bg-muted'}`}>
                              <Icon name="Volume2" size={18} className={channel.active ? 'text-primary-foreground' : 'text-muted-foreground'} />
                            </div>
                            <div>
                              <h3 className="font-semibold">{channel.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {channel.users === 0 ? "Нет участников" : `${channel.users} участн.`}
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant={channel.active ? "default" : "secondary"} className="military-corner-small">
                            {channel.active ? "Подключен" : "Подключиться"}
                          </Button>
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
            <div className="flex-1 p-6">
              <div className="max-w-2xl mx-auto">
                {schedule.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Нет событий в расписании</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedule.map((event) => (
                      <div
                        key={event.id}
                        className="bg-card border border-border p-4 military-corner hover:border-accent/50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-accent/20 text-accent px-4 py-2 military-corner-small text-center">
                            <div className="text-sm font-bold">{event.date}</div>
                            <div className="text-lg font-bold">{event.time}</div>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{event.title}</h3>
                            <p className="text-sm text-muted-foreground">Обязательное участие всего состава</p>
                          </div>
                          <Button size="sm" variant="outline" className="military-corner-small">
                            Подробнее
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;