import emailjs from "@emailjs/browser";

export type BookingEmail = {
  parentName: string;
  parentEmail: string;
  studentName: string;
  grade: string;
  subject: string;
  tutorName: string;
  slotLabel: string;
  rate: number;
};

export async function sendBookingEmails(data: BookingEmail) {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
  if (!serviceId || !templateId || !publicKey) {
    return { parent: "not_configured", owner: "not_configured" } as const;
  }

  try {
    await emailjs.send(
      serviceId,
      templateId,
      {
        parent_name: data.parentName,
        parent_email: data.parentEmail,
        student_first_name: data.studentName,
        student_grade: data.grade,
        subject: data.subject,
        tutor_name: data.tutorName,
        session_time: data.slotLabel,
        rate: `$${data.rate}/hour`,
      },
      { publicKey },
    );
    return { parent: "sent", owner: "sent" } as const;
  } catch {
    return { parent: "delayed", owner: "delayed" } as const;
  }
}
