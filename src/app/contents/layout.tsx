import { ReactNode } from "react";

export const maxDuration = 300;
export const runtime = 'edge';

export default function ContentsRootLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
