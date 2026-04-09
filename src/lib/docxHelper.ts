import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { Student } from "../types";

export const generateStudentReport = async (student: Student, centerName: string) => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: centerName.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "BÁO CÁO HỌC TẬP CỦA HỌC VIÊN",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Họ và tên: `, bold: true }),
              new TextRun({ text: student.name }),
            ],
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Mục tiêu đào tạo: `, bold: true }),
              new TextRun({ text: student.goal || "Không xác định" }),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: "Nhận xét & Lộ trình:",
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 200 },
          }),
          ...student.performance ? student.performance.map(p => 
            new Paragraph({
              children: [
                new TextRun({ text: `Ngày ${p.date}: `, bold: true }),
                new TextRun({ text: p.comment }),
              ],
              spacing: { after: 120 },
            })
          ) : [
            new Paragraph({ text: "Chưa có nhận xét." })
          ],
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
};
