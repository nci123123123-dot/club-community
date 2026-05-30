"use client";

import { useEffect, useRef } from "react";
import OneSignal from "react-onesignal";
import { useCurrentUser } from "@/lib/user/provider";

export function OneSignalInit() {
  const { user } = useCurrentUser();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void OneSignal.init({
      appId: "f1e5fbc6-7c51-4475-9e92-b3e1eb0e6317",
      allowLocalhostAsSecureOrigin: true,
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    void OneSignal.login(user.studentId);
  }, [user]);

  return null;
}
