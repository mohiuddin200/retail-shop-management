import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import type { LabelFormat } from "@/lib/label-printing";

const PAGE_DIMENSIONS = {
  a4: { height: 842, width: 595 },
  thermal: { height: 85, width: 113 },
} as const;

export async function printLabelHtml(html: string, format: LabelFormat) {
  if (Platform.OS === "web") {
    await printHtmlOnWeb(html);
    return;
  }

  const dimensions = PAGE_DIMENSIONS[format];
  await Print.printAsync({
    height: dimensions.height,
    html,
    width: dimensions.width,
  });
}

export async function shareLabelPdf(html: string, format: LabelFormat) {
  if (Platform.OS === "web") {
    throw new Error("PDF export is available in the Android and iOS apps.");
  }

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (!sharingAvailable) {
    throw new Error("PDF sharing is not available on this device.");
  }

  const dimensions = PAGE_DIMENSIONS[format];
  const result = await Print.printToFileAsync({
    height: dimensions.height,
    html,
    width: dimensions.width,
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
