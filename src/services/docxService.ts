import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

interface DocxData {
  summary: string;
  qna: { question: string; answer: string }[];
  links: string[];
}

export async function generateDocx(data: DocxData) {
  const children: any[] = [];

  // Title
  children.push(
    new Paragraph({
      text: "Zoom Open Mic & Chat Analysis",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    })
  );

  // Summary Section
  children.push(
    new Paragraph({
      text: "Summary",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: data.summary,
      spacing: { after: 200 },
    })
  );

  // Links Section
  children.push(
    new Paragraph({
      text: "Links Shared",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  if (data.links && data.links.length > 0) {
    data.links.forEach((link) => {
      children.push(
        new Paragraph({
          text: link,
          bullet: { level: 0 },
        })
      );
    });
  } else {
    children.push(new Paragraph({ text: "No links were shared." }));
  }

  // Q&A Section
  children.push(
    new Paragraph({
      text: "Questions & Answers",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    })
  );

  if (data.qna && data.qna.length > 0) {
    data.qna.forEach((item, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Q${index + 1}: `, bold: true }),
            new TextRun({ text: item.question }),
          ],
          spacing: { before: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "A: ", bold: true }),
            new TextRun({ text: item.answer }),
          ],
          spacing: { after: 150 },
        })
      );
    });
  } else {
    children.push(new Paragraph({ text: "No Q&A extracted." }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Zoom_OpenMic_Analysis.docx");
}
