'use client';

import MainLandlord from "../../components/MainLandlord";
export default function LandlordDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MainLandlord>{children}</MainLandlord>;
}