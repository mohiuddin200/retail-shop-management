import { useMemo } from "react";
import Svg, { Path, Rect, type SvgProps } from "react-native-svg";

import { createQrMatrix, qrMatrixPath } from "@/lib/label-printing";

export function QrCodeSvg({
  payload,
  ...props
}: Omit<SvgProps, "viewBox"> & { payload: string }) {
  const matrix = useMemo(() => createQrMatrix(payload), [payload]);
  const path = useMemo(() => qrMatrixPath(matrix), [matrix]);

  return (
    <Svg
      accessibilityLabel={`QR code containing ${payload}`}
      accessibilityRole="image"
      viewBox={`0 0 ${matrix.totalSize} ${matrix.totalSize}`}
      {...props}>
      <Rect fill="#FFFFFF" height={matrix.totalSize} width={matrix.totalSize} x={0} y={0} />
      <Path d={path} fill="#000000" />
    </Svg>
  );
}
