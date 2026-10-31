import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

window.ComuniIsNativePlatform = Capacitor.isNativePlatform();
window.ComuniNativeSpeechRecognition = SpeechRecognition;
window.ComuniNativeTextToSpeech = TextToSpeech;
