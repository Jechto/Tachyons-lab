import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Uma Musume Tierlist and Deckbuilder Tool - Tachyons Lab",
    description: "Uma Musume support card tierlist generator and deckbuilder. Optimize your support card deck with AI-powered recommendations for different race types and running styles.",
    keywords: "Uma Musume, Umamusume, tierlist, deckbuilder, github",
    authors: [{ name: "Jechto" }],
    verification: {
        google: "a1UaFtEphUhB3Yv9kD_VWu1F6rwKdS2klV5HN9xSq3I",
    },
    icons: {
        icon: '/favicon.ico',
        shortcut: '/favicon.ico',
        apple: '/images/logo/logo512.png',
    },
    openGraph: {
        title: "Uma Musume Tierlist & Deckbuilder - Tachyons Lab",
        description: "Uma Musume support card optimization tool with tierlist generation and deckbuilding",
        type: "website",
        locale: "en_US",
        images: [
            {
                url: '/images/logo/logo512.png',
                width: 512,
                height: 512,
                alt: 'Tachyons Lab Logo',
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Uma Musume Tierlist & Deckbuilder - Tachyons Lab",
        description: "Free Uma Musume support card optimization tool",
        images: ['/images/logo/logo512.png'],
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                {children}
            </body>
        </html>
    );
}
