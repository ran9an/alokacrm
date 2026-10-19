import { notFound } from "next/navigation";
import { Dashboard } from "../page";
export default function Preview() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Dashboard preview />;
}
