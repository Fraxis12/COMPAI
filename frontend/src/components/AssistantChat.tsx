import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "./AppText";
import { BotAvatar, BotEmotion } from "./BotAvatar";
import { colors } from "../theme/colors";
import { appApi } from "../services/api";

type ChatMessage = { id: number; author: "user" | "assistant"; text: string };

function answerFor(message: string, name: string) {
  const value = message.toLowerCase();
  if (value.includes("organiza") || value.includes("día") || value.includes("tarea")) return `Claro, ${name}. Elige tus 3 tareas más importantes, reserva 25 minutos para la primera y deja 10 minutos entre bloques. ¿Cuál tarea urge más?`;
  if (value.includes("concentr") || value.includes("estudi")) return "Hagamos un bloque de enfoque: silencia distracciones, prepara solo lo necesario y trabaja 25 minutos en una meta concreta. Luego descansa 5. ¿Qué tema vas a estudiar?";
  if (value.includes("descanso") || value.includes("cans") || value.includes("estrés")) return "Pausa un momento: suelta los hombros, respira lento tres veces y toma un poco de agua. Un descanso corto también es avanzar. ¿Quieres una pausa de 5 o 10 minutos?";
  if (value.includes("hola") || value.includes("buenas")) return `¡Hola, ${name}! Puedo ayudarte a ordenar tus pendientes, estudiar con más calma o cuidar tu bienestar. ¿Qué tienes en mente?`;
  return "Te escucho. Puedo ayudarte a convertir eso en un plan pequeño y claro. Cuéntame qué resultado te gustaría conseguir hoy.";
}

export function AssistantChat({ visible, onClose, userName, initialDraft }: { visible: boolean; onClose: () => void; userName: string; initialDraft?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const firstName = userName.split(" ")[0] || "Compa";

  useEffect(() => {
    if (visible && messages.length === 0) setMessages([{ id: Date.now(), author: "assistant", text: `Hola, ${firstName}. Este es tu espacio. ¿En qué te acompaño hoy?` }]);
  }, [firstName, messages.length, visible]);

  useEffect(() => {
    if (visible && initialDraft) setDraft(initialDraft);
  }, [initialDraft, visible]);

  const sendMessage = async (text = draft) => {
    const cleanText = text.trim();
    if (!cleanText || thinking) return;
    const userMessage: ChatMessage = { id: Date.now(), author: "user", text: cleanText };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setThinking(true);
    try {
      const response = await appApi.chat(nextMessages.map((item) => ({ role: item.author, content: item.text })));
      setMessages((current) => [...current, { id: Date.now() + 1, author: "assistant", text: response.message }]);
    } catch (error) {
      const fallback = error instanceof Error ? error.message : answerFor(cleanText, firstName);
      setMessages((current) => [...current, { id: Date.now() + 1, author: "assistant", text: fallback }]);
    } finally {
      setThinking(false);
    }
  };

  const emotion: BotEmotion = thinking ? "focus" : "listening";

  const startNewChat = () => {
    setMessages([{ id: Date.now(), author: "assistant", text: `Empecemos de nuevo, ${firstName}. ¿En qué te ayudo?` }]);
    setDraft("");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.chatSurface}>
          <View style={styles.auraTop} />
          <View style={styles.sheetHandle} />
          <View style={styles.header}>
          <View style={styles.assistantIdentity}>
            <LinearGradient colors={["rgba(192,132,252,0.26)", "rgba(139,92,246,0.08)"]} style={styles.avatarWrap}><BotAvatar size={58} emotion={emotion} /></LinearGradient>
            <View style={styles.headerCopy}>
              <View style={styles.titleRow}><AppText style={styles.title}>CompAI</AppText><Ionicons name="checkmark-circle" color="#C084FC" size={15} /></View>
              <View style={styles.statusRow}><View style={styles.statusDot} /><AppText style={styles.status}>{thinking ? "Pensando en tu respuesta..." : "Asistente personal · En línea"}</AppText></View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]} onPress={startNewChat} disabled={thinking} accessibilityLabel="Nueva conversación"><Ionicons name="create-outline" color={colors.text} size={19} /></Pressable>
            <Pressable style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]} onPress={onClose} accessibilityLabel="Cerrar chat"><Ionicons name="close" color={colors.ink} size={22} /></Pressable>
          </View>
          </View>

          <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messageContent} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          <View style={styles.privacyPill}><Ionicons name="lock-closed" color="#A78BFA" size={10} /><AppText style={styles.privacyText}>CONVERSACIÓN PRIVADA</AppText></View>
          {messages.map((message) => (
            <View key={message.id} style={[styles.messageBlock, message.author === "user" && styles.userBlock]}>
              <AppText style={[styles.authorLabel, message.author === "user" && styles.userAuthorLabel]}>{message.author === "assistant" ? "CompAI" : "Tú"}</AppText>
              <View style={[styles.messageRow, message.author === "user" && styles.userRow]}>
                {message.author === "assistant" && <View style={styles.miniAvatar}><Ionicons name="sparkles" color="#D8B4FE" size={14} /></View>}
                {message.author === "user" ? (
                  <LinearGradient colors={["#9333EA", "#7C3AED"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.userBubble]}><AppText style={[styles.bubbleText, styles.userText]}>{message.text}</AppText></LinearGradient>
                ) : (
                  <View style={[styles.bubble, styles.assistantBubble]}><AppText style={styles.bubbleText}>{message.text}</AppText></View>
                )}
              </View>
            </View>
          ))}
          {thinking && <View style={styles.messageBlock}><AppText style={styles.authorLabel}>CompAI está escribiendo</AppText><View style={styles.messageRow}><View style={styles.miniAvatar}><Ionicons name="sparkles" color="#D8B4FE" size={14} /></View><View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}><View style={styles.typingDot} /><View style={[styles.typingDot, styles.typingDotMiddle]} /><View style={styles.typingDot} /></View></View></View>}
          </ScrollView>

          <View style={styles.composerArea}>
            <View style={styles.composerLabelRow}><Ionicons name="sparkles-outline" color="#A78BFA" size={12} /><AppText style={styles.composerLabel}>MENSAJE PARA COMPAI</AppText></View>
            <View style={styles.composer}>
              <TextInput value={draft} onChangeText={setDraft} placeholder="Escribe tu mensaje..." placeholderTextColor="#7F8BA8" style={styles.input} multiline maxLength={500} returnKeyType="send" blurOnSubmit={false} onSubmitEditing={() => sendMessage()} accessibilityLabel="Mensaje para CompAI" />
              <Pressable style={({ pressed }) => [styles.send, (!draft.trim() || thinking) && styles.sendDisabled, pressed && draft.trim() && styles.pressed]} onPress={() => sendMessage()} disabled={!draft.trim() || thinking} accessibilityLabel="Enviar mensaje"><LinearGradient colors={["#A855F7", "#7C3AED"]} style={styles.sendGradient}><Ionicons name="arrow-up" color="#FFFFFF" size={21} /></LinearGradient></Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 38 : 22, backgroundColor: "rgba(2,4,12,0.82)" },
  chatSurface: { width: "100%", maxWidth: 520, height: "84%", minHeight: 480, borderRadius: 27, borderWidth: 1, borderColor: "rgba(192,132,252,0.38)", backgroundColor: "#080A16", overflow: "hidden", shadowColor: "#A855F7", shadowOpacity: 0.24, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 16 },
  sheetHandle: { position: "absolute", zIndex: 5, top: 8, alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: "rgba(216,180,254,0.32)" },
  auraTop: { position: "absolute", width: 260, height: 260, borderRadius: 130, top: -150, left: -90, backgroundColor: "rgba(147,51,234,0.13)" },
  header: { paddingTop: 19, paddingHorizontal: 15, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: "rgba(168,85,247,0.18)", backgroundColor: "rgba(13,15,31,0.97)", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  assistantIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 11, minWidth: 0 },
  avatarWrap: { width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: "rgba(192,132,252,0.3)" },
  headerCopy: { flex: 1, minWidth: 0 }, titleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  title: { color: colors.ink, fontSize: 19, lineHeight: 23, fontWeight: "900" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }, statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#A855F7" }, status: { color: "#A8B3CC", fontSize: 9, lineHeight: 12 },
  headerActions: { flexDirection: "row", gap: 7 }, headerButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.055)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  messages: { flex: 1 }, messageContent: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 28, gap: 17 },
  privacyPill: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 11, borderWidth: 1, borderColor: "rgba(167,139,250,0.15)", backgroundColor: "rgba(139,92,246,0.07)", paddingHorizontal: 10, paddingVertical: 5, marginBottom: 2 }, privacyText: { color: "#8F9BB5", fontSize: 7, fontWeight: "900", letterSpacing: 0.6 },
  messageBlock: { maxWidth: "91%" }, userBlock: { alignSelf: "flex-end", alignItems: "flex-end" }, authorLabel: { color: "#9B87C6", fontSize: 8, lineHeight: 11, fontWeight: "900", marginLeft: 37, marginBottom: 4 }, userAuthorLabel: { color: "#7886A5", marginLeft: 0, marginRight: 3 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 }, userRow: { alignSelf: "flex-end", justifyContent: "flex-end" },
  miniAvatar: { width: 29, height: 29, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(147,51,234,0.16)", borderWidth: 1, borderColor: "rgba(192,132,252,0.28)" },
  bubble: { borderRadius: 19, paddingHorizontal: 14, paddingVertical: 11 }, assistantBubble: { backgroundColor: "#171A2C", borderBottomLeftRadius: 6, borderWidth: 1, borderColor: "rgba(148,163,184,0.16)" }, userBubble: { borderBottomRightRadius: 6 },
  bubbleText: { color: "#E3E8F5", fontSize: 13, lineHeight: 20 }, userText: { color: "#FFFFFF", fontWeight: "700" }, typingBubble: { flexDirection: "row", gap: 5, paddingVertical: 15, paddingHorizontal: 16 }, typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#A78BFA", opacity: 0.55 }, typingDotMiddle: { opacity: 1 },
  composerArea: { borderTopWidth: 1, borderTopColor: "rgba(168,85,247,0.18)", backgroundColor: "#0D0F1F", paddingTop: 10, paddingHorizontal: 12, paddingBottom: 11 },
  composerLabelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginLeft: 3, marginBottom: 7 }, composerLabel: { color: "#82739F", fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  composer: { minHeight: 54, maxHeight: 112, borderRadius: 18, borderWidth: 1, borderColor: "rgba(168,85,247,0.32)", backgroundColor: "#15182A", flexDirection: "row", alignItems: "flex-end", gap: 8, paddingLeft: 14, paddingRight: 6, paddingVertical: 6 }, input: { flex: 1, minHeight: 40, maxHeight: 94, color: colors.ink, fontSize: 13, lineHeight: 19, paddingTop: 10, paddingBottom: 7 },
  send: { width: 42, height: 42, borderRadius: 14, overflow: "hidden" }, sendGradient: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center" }, sendDisabled: { opacity: 0.32 }, pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] }
});
