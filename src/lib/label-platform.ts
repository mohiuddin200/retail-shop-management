import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

const A4_WIDTH_AT_72_PPI = 595;
const A4_HEIGHT_AT_72_PPI = 842;

export async function printA4LabelHtml(html: string) {
  if (Platform.OS === "web") {
    await printHtmlOnWeb(html);
    return;
  }

  await Print.printAsync({
    height: A4_HEIGHT_AT_72_PPI,
    html,
    width: A4_WIDTH_AT_72_PPI,
  });
}

export async function shareA4LabelPdf(html: string) {
  if (Platform.OS === "web") {
    throw new Error("PDF export is available in the Android and iOS apps.");
  }

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (!sharingAvailable) {
    throw new Error("PDF sharing is not available on this device.");
  }

  const result = await Print.printToFileAsync({
    height: A4_HEIGHT_AT_72_PPI,
    html,
    width: A4_WIDTH_AT_72_PPI,
  });
  await Sharing.shareAsync(result.uri, {
    UTI: "com.adobe.pdf",
    dialogTitle: "Share inventory labels",
    mimeType: "application/pdf",
  });

  return result.numberOfPages;
}

export function labelActionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/cancel|closed|dismiss/i.test(message)) {
    return "The print or share dialog was closed before the job started.";
  }
  return message || "The label job could not be generated.";
}

async function printHtmlOnWeb(html: string) {
  if (typeof document === "undefined") {
    throw new Error("The browser print document is unavailable.");
  }

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("title", "Inventory label print document");
  frame.style.border = "0";
  frame.style.height = "0";
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.width = "0";

  const loaded = new Promise<void>((resolve, reject) => {
    const timeout = globalThis.setTimeout(
      () => reject(new Error("The print document took too long to generate.")),
      10_000,
    );
    frame.onload = () => {
      globalThis.clearTimeout(timeout);
      resolve();
    };
  });

  frame.srcdoc = html;
  document.body.appendChild(frame);

  try {
    await loaded;
    const printWindow = frame.contentWindow;
    if (!printWindow) {
      throw new Error("The browser print dialog is unavailable.");
    }
    printWindow.focus();
    printWindow.print();
  } finally {
    globalThis.setTimeout(() => frame.remove(), 1_000);
  }
}
