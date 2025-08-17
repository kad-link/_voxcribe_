import whisper

# Load the Whisper model - change "base" to a smaller/larger model if you want
model = whisper.load_model("large")

# Path to your audio file
audio_path = "example.m4a"

# Transcribe the audio file
result = model.transcribe(audio_path)

# Print the transcription text
print("Transcription:\n", result["text"])
