import { GoogleGenAI } from "@google/genai";

const FALLBACK_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-flash'
];

export async function callGeminiAI(prompt: string, providedApiKey?: string, preferredModel?: string) {
  const apiKey = providedApiKey || localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  // Determine starting models list
  let modelsToTry = [...FALLBACK_MODELS];
  const defaultModel = preferredModel || localStorage.getItem('gemini_model') || FALLBACK_MODELS[0];
  
  // Bring preferred model to the front, remove duplicates
  modelsToTry = [defaultModel, ...modelsToTry.filter(m => m !== defaultModel)];

  const ai = new GoogleGenAI({ apiKey });
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[AI] Đang thử model: ${modelName}...`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      return response.text;
    } catch (error: any) {
      console.error(`[AI] Lỗi với model ${modelName}:`, error.message);
      lastError = error;
      // Continue to next model
    }
  }

  throw new Error(`Tất cả model đều thất bại. Lỗi cuối: ${lastError?.message || 'Unknown'}`);
}

export const AI_PROMPTS = {
  ANALYZE_FINANCE: (data: string) => `Dựa trên dữ liệu tài chính sau của trung tâm tiếng Anh, hãy phân tích tình hình doanh thu, chi phí và đưa ra 3 lời khuyên tối ưu hóa. Trả về kết quả bằng tiếng Việt, định dạng Markdown.\nDữ liệu: ${data}`,
  CLASSIFY_TRANSACTION: (desc: string) => `Phân loại giao dịch sau vào một trong các danh mục: Học phí, Lương giáo viên, Thuê mặt bằng, Điện nước, Marketing, Khác. Trả về duy nhất tên danh mục.\nMô tả: ${desc}`,
  GENERATE_LESSON_PLAN: (topic: string) => `Tạo một giáo án ngắn gọn cho buổi học tiếng Anh với chủ đề: ${topic}. Bao gồm: Mục tiêu, Từ vựng chính, Hoạt động lớp học. Trả về định dạng Markdown.`,
  GENERATE_STUDENT_REVIEW: (studentData: string) => `Dựa trên dữ liệu học tập và điểm danh sau đây của học viên, hãy soạn thảo một Đánh giá cuối kỳ/nhận xét để gửi cho phụ huynh. Đóng vai là giáo viên phụ trách, hãy viết bằng giọng điệu chuyên nghiệp, tích cực, nhưng vẫn nhắc nhở nếu học viên vắng nhiều. Hãy viết dưới dạng thư gửi phụ huynh (Chào Anh/Chị...). Định dạng văn bản là Markdown. 
Dữ liệu học viên: ${studentData}`,
};
