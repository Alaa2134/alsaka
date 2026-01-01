import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSoundAlerts = () => {
  const { tenant } = useAuth();

  const { data: soundEnabled = true } = useQuery({
    queryKey: ["sound-alerts", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return true;
      
      const { data, error } = await supabase
        .from("company_settings")
        .select("sound_alerts_enabled")
        .eq("tenant_id", tenant.id)
        .single();
      
      if (error) return true;
      return data?.sound_alerts_enabled ?? true;
    },
    enabled: !!tenant?.id,
  });

  const playAlertSound = () => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log("Audio not supported");
    }
  };

  return { soundEnabled, playAlertSound };
};
