#!/usr/bin/env python3
"""
Récupère le transcript (sous-titres) d'une vidéo YouTube des 12 Coups de Midi.
Usage: python3 grab_transcript.py <url_youtube>

Exemples:
  python3 grab_transcript.py "https://www.youtube.com/watch?v=XXXXX"
  python3 grab_transcript.py XXXXX
"""
import sys, re, warnings
warnings.filterwarnings('ignore')

from youtube_transcript_api import YouTubeTranscriptApi

def extract_id(url):
    m = re.search(r'(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})', url)
    return m.group(1) if m else url.strip()

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 grab_transcript.py <url_ou_video_id>")
        sys.exit(1)

    vid = extract_id(sys.argv[1])
    print(f"Video: {vid}")
    api = YouTubeTranscriptApi()

    # Lister les transcripts disponibles
    try:
        tl = api.list(vid)
        available = list(tl)
        print(f"Sous-titres disponibles:")
        for t in available:
            tag = "[auto]" if t.is_generated else "[manual]"
            print(f"  {t.language} ({t.language_code}) {tag}")
    except Exception as e:
        print(f"Erreur: {e}")
        sys.exit(1)

    # Chercher français en priorité
    transcript = None
    for t in available:
        if t.language_code.startswith('fr'):
            transcript = t.fetch()
            print(f"\nUtilisation: {t.language} ({t.language_code})")
            break

    if not transcript:
        # Fallback: premier disponible
        if available:
            transcript = available[0].fetch()
            print(f"\nPas de français, utilisation: {available[0].language}")
        else:
            print("Aucun sous-titre disponible.")
            sys.exit(1)

    # Sauvegarder
    out = f"transcript_{vid}.txt"
    with open(out, "w", encoding="utf-8") as f:
        for entry in transcript.snippets:
            f.write(entry.text + "\n")

    print(f"\nSauvegardé: {out} ({len(transcript.snippets)} lignes)")
    print("\n--- Aperçu (20 premières lignes) ---")
    for entry in transcript.snippets[:20]:
        print(f"  [{entry.start:.0f}s] {entry.text}")

if __name__ == "__main__":
    main()
