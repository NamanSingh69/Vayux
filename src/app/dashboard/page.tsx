import { DelhiAqiMap } from "@/components/map/delhi-aqi-map";
import JarvisVoiceWidget from "@/components/jarvis/JarvisVoiceWidget";

export default function Dashboard() {
  return (
    <>
      <DelhiAqiMap />
      <JarvisVoiceWidget />
    </>
  );
}