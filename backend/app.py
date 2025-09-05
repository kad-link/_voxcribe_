from flask import Flask, request, jsonify
import whisper
import os
from flask_cors import CORS
from supabase import create_client, Client
import uuid
import requests
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Load Whisper once (not on every request)
print("🎤 Loading Whisper model...")
model = whisper.load_model("base")
print("✅ Whisper model loaded successfully")

# Environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://mdyrsixljvfxpvyjtadi.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
HF_TOKEN = os.getenv("HF_TOKEN")
PORT = int(os.getenv("PORT", 5000))

# Validate required environment variables
if not SUPABASE_KEY:
    raise ValueError("SUPABASE_KEY environment variable is required")
if not HF_TOKEN:
    raise ValueError("HF_TOKEN environment variable is required")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Flask setup
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
UPLOAD_FOLDER = "/tmp"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Hugging Face Summarizer Class with better debugging
class HuggingFaceSummarizer:
    def __init__(self, hf_token: str):
        self.api_url = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"
        self.headers = {"Authorization": f"Bearer {hf_token}"}
        print(f"✅ HuggingFace Summarizer initialized")
        
    def summarize(self, text: str, max_retries: int = 3):
        print(f"📝 Starting summarization for text: {text[:100]}...")
        
        if not text or not text.strip():
            print("❌ Empty text provided for summarization")
            return None
            
        cleaned_text = self._preprocess_text(text)
        print(f"🧹 Cleaned text: {cleaned_text[:100]}...")
        
        payload = {
            "inputs": cleaned_text,
            "parameters": {
                "max_length": 130,
                "min_length": 30,
                "do_sample": False
            }
        }
        
        for attempt in range(max_retries):
            try:
                print(f"🔄 Attempt {attempt + 1} - Calling HuggingFace API...")
                response = requests.post(
                    self.api_url,
                    headers=self.headers,
                    json=payload,
                    timeout=30
                )
                
                print(f"📡 HF API Response Status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"📋 HF API Response received")
                    
                    if isinstance(result, list) and len(result) > 0:
                        summary = result[0].get('summary_text', '')
                        if summary and summary.strip():
                            print(f"✅ Summary generated successfully")
                            return summary.strip()
                        else:
                            print("❌ Empty summary_text in response")
                    else:
                        print("❌ Invalid response format")
                        
                elif response.status_code == 503:
                    print(f"⏳ Model loading, waiting... (attempt {attempt + 1})")
                    time.sleep(10)
                    continue
                    
                elif response.status_code == 429:
                    print(f"⏳ Rate limit hit, waiting... (attempt {attempt + 1})")
                    time.sleep(60)
                    continue
                    
                else:
                    error_text = response.text
                    print(f"❌ HF API Error {response.status_code}: {error_text}")
                    
            except Exception as e:
                print(f"❌ Exception during summarization: {str(e)}")
                if attempt < max_retries - 1:
                    print(f"⏳ Waiting 5 seconds before retry...")
                    time.sleep(5)
        
        print("❌ All summarization attempts failed")
        return None
    
    def _preprocess_text(self, text: str) -> str:
        # Remove filler words and clean up text
        filler_words = ["um", "uh", "like", "you know", "basically", "actually", "literally"]
        words = text.split()
        cleaned_words = [w for w in words if w.lower().strip('.,!?') not in filler_words]
        
        # Truncate if too long (BART has input limits)
        if len(cleaned_words) > 1000:
            print(f"⚠️ Truncating text from {len(cleaned_words)} to 1000 words")
            cleaned_words = cleaned_words[:1000]
            
        cleaned_text = ' '.join(cleaned_words)
        print(f"🧹 Preprocessing: {len(words)} -> {len(cleaned_words)} words")
        return cleaned_text

# Initialize summarizer
print(f"🚀 Initializing summarizer...")
summarizer = HuggingFaceSummarizer(HF_TOKEN) if HF_TOKEN else None

if not summarizer:
    print("❌ WARNING: Summarizer not initialized - HF_TOKEN missing!")

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for deployment monitoring"""
    return jsonify({
        "status": "healthy",
        "whisper_loaded": model is not None,
        "summarizer_ready": summarizer is not None
    })

@app.route("/transcribe", methods=["POST"])
def upload_audio():
    print("🎤 === NEW TRANSCRIPTION REQUEST ===")
    
    if "audio" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400

    file = request.files["audio"]
    print(f"📁 Received file: {file.filename}")

    # Create unique filename
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
    file.save(file_path)
    print(f"💾 Saved to: {file_path}")

    # Transcribe with Whisper
    try:
        print("🎯 Starting Whisper transcription...")
        result = model.transcribe(file_path)
        transcription_text = result["text"]
        duration = result.get("duration", 0)
        print(f"✅ Transcription completed: {len(transcription_text)} characters")
    except Exception as e:
        print(f"❌ Whisper transcription failed: {str(e)}")
        # Clean up temp file on error
        try:
            os.remove(file_path)
        except:
            pass
        return jsonify({"success": False, "error": f"Transcription failed: {str(e)}"}), 500

    # Generate AI Summary
    summary = None
    
    print("🤖 Starting AI summary generation...")
    
    if not summarizer:
        print("❌ Summarizer not available")
    elif not transcription_text.strip():
        print("❌ Empty transcription text")
    else:
        try:
            print("📊 Calling summarizer...")
            summary = summarizer.summarize(transcription_text)
            
            if summary and summary.strip():
                print(f"✅ Summary generated successfully")
            else:
                print("❌ Summary generation returned empty result")
                
        except Exception as e:
            print(f"❌ Summary generation error: {str(e)}")

    # Clean up temp file
    try:
        os.remove(file_path)
        print("🗑️ Temporary file cleaned up")
    except Exception as e:
        print(f"⚠️ Failed to clean up temp file: {e}")

    # Return response
    response_data = {
        "success": True,
        "transcription": transcription_text,
        "summary": summary,
        "duration": duration
    }
    
    print("📤 Sending response")
    print("🎤 === TRANSCRIPTION REQUEST COMPLETED ===")
    
    return jsonify(response_data)

@app.route("/regenerate-summary/<recording_id>", methods=["POST"])
def regenerate_summary(recording_id):
    """Regenerate summary for existing recording"""
    print(f"🔄 Regenerating summary for recording: {recording_id}")
    
    try:
        # Get existing recording
        result = supabase.table('recordings').select('transcription').eq('id', recording_id).execute()
        
        if not result.data:
            print("❌ Recording not found")
            return jsonify({'success': False, 'error': 'Recording not found'}), 404
            
        transcription_text = result.data[0]['transcription']
        print(f"📝 Retrieved transcription: {len(transcription_text)} characters")
        
        if not summarizer:
            print("❌ Summarizer not available for regeneration")
            return jsonify({'success': False, 'error': 'Summarizer not available'}), 500
            
        # Generate new summary
        print("🤖 Generating new summary...")
        summary = summarizer.summarize(transcription_text)
        
        print(f"📊 Regeneration result: {'Success' if summary else 'Failed'}")
        
        # Update in database
        supabase.table('recordings').update({
            'summary': summary,
        }).eq('id', recording_id).execute()
        
        print("✅ Database updated")
        
        return jsonify({
            'success': True,
            'summary': summary,
        })
        
    except Exception as e:
        print(f"❌ Regeneration error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route("/test-summary", methods=["POST"])
def test_summary():
    """Test endpoint to debug summarization"""
    try:
        data = request.get_json()
        text = data.get('text', 'This is a test transcription to check if the summarization service is working correctly.')
        
        print(f"🧪 Testing summarization with text: {text[:100]}...")
        
        if not summarizer:
            return jsonify({
                'success': False,
                'error': 'Summarizer not initialized'
            })
            
        summary = summarizer.summarize(text)
        
        return jsonify({
            'success': True,
            'original_text': text,
            'summary': summary,
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

if __name__ == "__main__":
    print("🚀 Starting Flask server...")
    # For development
    if os.getenv("FLASK_ENV") == "development":
        app.run(debug=True, host="0.0.0.0", port=PORT)
    else:
        # For production (gunicorn will handle this)
        app.run(host="0.0.0.0", port=PORT)