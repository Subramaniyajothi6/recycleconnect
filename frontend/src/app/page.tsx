import { redirect } from "next/navigation";

// The proxy sends signed-in users to their home screen; everyone else signs in.
export default function Home() {
  redirect("/login");
}
