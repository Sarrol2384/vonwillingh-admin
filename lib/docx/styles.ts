import {
  BorderStyle,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

export const ACCENT = "1A4D6D";
export const MUTED = "555555";
export const LINE = "CCCCCC";
export const FONT = "Calibri";

export function sectionTitle(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({ text, bold: true, color: ACCENT, size: 26, font: FONT }),
    ],
  });
}

export function subTitle(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({ text, bold: true, color: ACCENT, size: 22, font: FONT }),
    ],
  });
}

export function body(
  text: string,
  opts: { muted?: boolean; italics?: boolean; bold?: boolean } = {},
) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text,
        size: 20,
        font: FONT,
        bold: !!opts.bold,
        color: opts.muted ? MUTED : "222222",
        italics: !!opts.italics,
      }),
    ],
  });
}

export function tip(text: string) {
  return new Paragraph({
    spacing: { after: 60 },
    border: {
      left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 8 },
    },
    indent: { left: 120 },
    children: [
      new TextRun({
        text: "Suggestion: ",
        bold: true,
        size: 18,
        font: FONT,
        color: ACCENT,
      }),
      new TextRun({
        text,
        size: 18,
        font: FONT,
        color: MUTED,
        italics: true,
      }),
    ],
  });
}

export function check(text: string) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text: "[ ]  ", size: 20, font: FONT }),
      new TextRun({ text, size: 20, font: FONT }),
    ],
  });
}

export function fillLine(label: string, value?: string) {
  const display = value?.trim() ? value : "_".repeat(52);
  return new Paragraph({
    spacing: { after: 70 },
    children: [
      new TextRun({ text: `${label} `, size: 20, font: FONT, bold: true }),
      new TextRun({
        text: display,
        size: 20,
        font: FONT,
        color: value?.trim() ? "222222" : "AAAAAA",
      }),
    ],
  });
}

export function fillBlock(label: string, value?: string, lines = 2) {
  const paras = [
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: label, size: 20, font: FONT, bold: true }),
      ],
    }),
  ];
  if (value?.trim()) {
    paras.push(body(value));
    return paras;
  }
  for (let i = 0; i < lines; i++) {
    paras.push(
      new Paragraph({
        spacing: { after: 50 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: LINE, space: 1 },
        },
        children: [new TextRun({ text: " ", size: 20, font: FONT })],
      }),
    );
  }
  return paras;
}

export function centeredTitle(text: string, size = 36) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [
      new TextRun({
        text,
        bold: true,
        size,
        font: FONT,
        color: ACCENT,
      }),
    ],
  });
}

export function centeredSubtitle(text: string) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [
      new TextRun({
        text,
        size: 18,
        font: FONT,
        color: MUTED,
        italics: true,
      }),
    ],
  });
}

export function centeredHeading(text: string) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 4 },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        font: FONT,
        color: "222222",
      }),
    ],
  });
}

export function footerLine(text: string) {
  return new Paragraph({
    spacing: { before: 300 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 8, color: LINE, space: 8 },
    },
    children: [
      new TextRun({ text, size: 14, font: FONT, color: MUTED }),
    ],
  });
}
