// استبدل القيمة دي بالـ OAuth Client ID الحقيقي بتاعك من Google Cloud Console
// (Google Cloud Console → APIs & Services → Credentials → OAuth client ID → Web application)
// نفس تعليمات الإعداد موجودة بالتفصيل في README.md

export const DRIVE_CLIENT_ID = "166700453092-r0v8tigvkddtpci64cb36br8d0rk645m.apps.googleusercontent.com";

// drive.file: صلاحية "غير حساسة" في تصنيف جوجل — التطبيق بيوصل بس للملفات اللي هو نفسه
// أنشأها في درايف المستخدم، مش كل حاجة تانية في حسابه
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
