import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Ledger, localDate, validateLedger } from "./domain";
export async function exportBackup(data: Ledger) {
  const text = JSON.stringify(data, null, 2),
    filename = `nep-nha-${localDate()}.json`;
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw Error("Thiết bị chưa hỗ trợ chia sẻ tệp.");
  const file = new File(Paths.cache, filename);
  file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "Lưu bản sao thu chi",
  });
}
export async function readBackup(): Promise<Ledger | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > 20 * 1024 * 1024)
    throw Error("Tệp quá lớn (tối đa 20 MB).");
  const text =
    Platform.OS === "web" && asset.file
      ? await asset.file.text()
      : await new File(asset.uri).text();
  return validateLedger(JSON.parse(text));
}
