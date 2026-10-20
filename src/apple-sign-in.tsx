import React, { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { cloud } from "./cloud";

export async function signInWithApple(link = false) {
  if (!cloud) throw Error("Chưa kết nối máy chủ.");
  if (Platform.OS === "web") {
    const credentials = {
      provider: "apple" as const,
      options: {
        redirectTo: "https://nep-nha-thu-chi.lunargem512.chatgpt.site/settings",
      },
    };
    const result = link
      ? await cloud.auth.linkIdentity(credentials)
      : await cloud.auth.signInWithOAuth(credentials);
    if (result.error) throw result.error;
    return;
  }
  if (Platform.OS !== "ios" || !(await AppleAuthentication.isAvailableAsync()))
    throw Error("Đăng nhập Apple chưa khả dụng trên thiết bị này.");
  const nonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce,
  );
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
    if (!credential.identityToken)
      throw Error("Apple chưa trả về thông tin xác thực. Hãy thử lại.");
    const credentials = {
      provider: "apple" as const,
      token: credential.identityToken,
      nonce,
    };
    // Linking must retain the current account, including when Apple hides email.
    const result = link
      ? await cloud.auth.linkIdentity(credentials)
      : await cloud.auth.signInWithIdToken(credentials);
    if (result.error) throw result.error;
    // The app's existing mandatory name screen collects a user-chosen display name.
  } catch (error) {
    if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED") return;
    throw error;
  }
}

export function AppleSignInButton({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    if (Platform.OS === "ios")
      void AppleAuthentication.isAvailableAsync()
        .then((value) => {
          if (active) setAvailable(value);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (Platform.OS === "ios")
    return available ? (
      <View
        pointerEvents={disabled ? "none" : "auto"}
        style={{ opacity: disabled ? 0.45 : 1 }}
      >
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
          }
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={{ width: "100%", height: 50 }}
          onPress={onPress}
        />
      </View>
    ) : null;
  if (Platform.OS !== "web") return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tiếp tục với Apple"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: "#000",
        minHeight: 50,
        paddingHorizontal: 18,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: 16,
          fontWeight: "600",
          lineHeight: 24,
        }}
      >
        Tiếp tục với Apple
      </Text>
    </Pressable>
  );
}
