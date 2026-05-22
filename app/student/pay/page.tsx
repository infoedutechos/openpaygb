import { StudentPayClient } from "./StudentPayClient";

export const metadata = {
  title: "Tuition payment — Student",
  description: "Pay tuition with TON via your student portal.",
};

export default function StudentPayPage() {
  return <StudentPayClient />;
}
