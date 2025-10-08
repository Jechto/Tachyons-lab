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
    title: "Free Uma Musume Support Card Tierlist & Deck Builder",
    description: "Build winning Uma Musume decks instantly with our free optimizer. Get support card rankings for Sprint, Mile, Medium & Long races. 200+ cards analyzed for optimal synergies and race strategies.",
    keywords: "Uma Musume, Umamusume, tierlist, tier list, deckbuilder, deck builder, support cards, training, race optimization, racing strategy, running styles, TCG, card game, support card tier list, uma musume pretty derby",
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
        siteName: 'Uma Musume Tierlist & Deckbuilder - Tachyons Lab',
        title: "Free Uma Musume Support Card Tierlist & Deck Builder",
        description: "Build winning Uma Musume decks instantly with our free optimizer. Get support card rankings for optimal race strategies.",
        url: "https://jechto.github.io/Tachyons-lab/",
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
        title: "Free Uma Musume Support Card Tierlist & Deck Builder",
        description: "Build winning decks instantly. AI-powered support card rankings for optimal race strategies.",
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
