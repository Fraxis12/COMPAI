import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, ImageSourcePropType, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../theme/colors";

export const botEmotionImages = {
  default: require("../../assets/assistant/assistant-avatar-mobile.png"),
  welcome: require("../../assets/assistant/emotions/welcome.png"),
  celebration: require("../../assets/assistant/emotions/celebration.png"),
  curious: require("../../assets/assistant/emotions/curious.png"),
  alert: require("../../assets/assistant/emotions/alert.png"),
  support: require("../../assets/assistant/emotions/support.png"),
  focus: require("../../assets/assistant/emotions/focus.png"),
  rest: require("../../assets/assistant/emotions/rest.png"),
  question: require("../../assets/assistant/emotions/question.png"),
  error: require("../../assets/assistant/emotions/error.png"),
  listening: require("../../assets/assistant/emotions/listening.png"),
  surprise: require("../../assets/assistant/emotions/surprise.png"),
  shy: require("../../assets/assistant/emotions/shy.png"),
  expert: require("../../assets/assistant/emotions/expert.png"),
  encourage: require("../../assets/assistant/emotions/encourage.png"),
  sassy: require("../../assets/assistant/emotions/sassy.png"),
  study: require("../../assets/assistant/emotions/study.png"),
  nutrition: require("../../assets/assistant/cara de nutricion-transparente.png"),
  streakOff: require("../../assets/assistant/emotions/streak-off.png"),
  streakOn: require("../../assets/assistant/emotions/streak-on.png")
} as const;

export type BotEmotion = keyof typeof botEmotionImages;

interface BotAvatarProps {
  size?: number;
  style?: ViewStyle;
  animated?: boolean;
  emotion?: BotEmotion;
  emotionSequence?: BotEmotion[];
  emotionIntervalMs?: number;
}

export function BotAvatar({
  size = 72,
  style,
  animated = true,
  emotion = "default",
  emotionSequence,
  emotionIntervalMs = 900
}: BotAvatarProps) {
  const breathe = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const charm = useRef(new Animated.Value(0)).current;
  const emotionHop = useRef(new Animated.Value(0)).current;
  const currentEmotion = useRef<BotEmotion>(emotion);
  const [, setRenderTick] = useState(0);
  const forceRender = useCallback(() => {
    setRenderTick((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!animated) {
      return;
    }

    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );

    const charmLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(charm, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true
        }),
        Animated.timing(charm, {
          toValue: 0.45,
          duration: 180,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(charm, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(charm, {
          toValue: 0,
          duration: 360,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.delay(2800)
      ])
    );

    breatheLoop.start();
    floatLoop.start();
    charmLoop.start();

    return () => {
      breatheLoop.stop();
      floatLoop.stop();
      charmLoop.stop();
    };
  }, [animated, breathe, charm, float]);

  useEffect(() => {
    currentEmotion.current = emotion;
    emotionHop.setValue(0);
    forceRender();
  }, [emotion, emotionHop, forceRender]);

  useEffect(() => {
    if (!animated || !emotionSequence?.length) {
      return;
    }

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    let index = 0;
    const sequence = emotionSequence.filter((item) => botEmotionImages[item]);

    const playNextEmotion = () => {
      if (!active || sequence.length === 0) {
        return;
      }

      const target = sequence[index % sequence.length];
      index += 1;

      if (target === currentEmotion.current) {
        timeoutId = setTimeout(playNextEmotion, Math.max(520, emotionIntervalMs * 0.7));
        return;
      }

      emotionHop.setValue(0);

      Animated.sequence([
        Animated.timing(emotionHop, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(emotionHop, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.back(1.35)),
          useNativeDriver: true
        })
      ]).start(() => {
        if (!active) {
          return;
        }

        currentEmotion.current = target;
        emotionHop.setValue(0);
        forceRender();
        timeoutId = setTimeout(playNextEmotion, emotionIntervalMs);
      });
    };

    timeoutId = setTimeout(playNextEmotion, 700);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [animated, emotionHop, emotionIntervalMs, emotionSequence, forceRender]);

  const avatarScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035]
  });
  const avatarTranslateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -size * 0.07]
  });
  const avatarRotate = float.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-2deg", "2deg", "-2deg"]
  });
  const charmTranslateY = charm.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, size * 0.018, -size * 0.045]
  });
  const charmRotate = charm.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: ["0deg", "-3deg", "5deg"]
  });
  const charmScaleX = charm.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [1, 1.055, 0.98]
  });
  const charmScaleY = charm.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [1, 0.96, 1.075]
  });
  const emotionTranslateY = emotionHop.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -size * 0.08]
  });
  const emotionScaleX = emotionHop.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.98]
  });
  const emotionScaleY = emotionHop.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.045]
  });
  const haloScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.16]
  });
  const haloOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.78]
  });
  const currentSource: ImageSourcePropType = botEmotionImages[currentEmotion.current] ?? botEmotionImages.default;

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <Animated.View
        style={[
          styles.halo,
          {
            width: size * 0.8,
            height: size * 0.8,
            borderRadius: size * 0.4,
            opacity: animated ? haloOpacity : 0.45,
            transform: [{ scale: animated ? haloScale : 1 }]
          }
        ]}
      />
      <Animated.View
        style={[
          styles.avatarLayer,
          {
            transform: [
              { translateY: animated ? avatarTranslateY : 0 },
              { translateY: animated ? charmTranslateY : 0 },
              { translateY: animated ? emotionTranslateY : 0 },
              { rotate: animated ? avatarRotate : "0deg" },
              { rotate: animated ? charmRotate : "0deg" },
              { scale: animated ? avatarScale : 1 },
              { scaleX: animated ? charmScaleX : 1 },
              { scaleY: animated ? charmScaleY : 1 },
              { scaleX: animated ? emotionScaleX : 1 },
              { scaleY: animated ? emotionScaleY : 1 }
            ]
          }
        ]}
      >
        <Animated.Image
          source={currentSource}
          resizeMode="contain"
          style={styles.image}
          accessibilityLabel="Asistente de la aplicación"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.info,
    shadowOpacity: 0.48,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  avatarLayer: {
    width: "100%",
    height: "100%"
  },
  halo: {
    position: "absolute",
    backgroundColor: "rgba(139,92,246,0.22)",
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 16
  },
  image: {
    width: "100%",
    height: "100%"
  }
});
