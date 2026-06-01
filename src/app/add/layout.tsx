import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add a Toilet | SafeToilets",
  description: "Contribute and add a new public toilet location",
};

export default function AddToiletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
