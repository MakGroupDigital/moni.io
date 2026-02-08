#!/usr/bin/env python3
"""
Script pour supprimer le fond blanc du logo et le sauvegarder avec transparence
"""

from PIL import Image
import os

def remove_white_background(input_path, output_path, threshold=240):
    """
    Supprime le fond blanc d'une image PNG et le remplace par de la transparence
    
    Args:
        input_path: Chemin du fichier PNG d'entrée
        output_path: Chemin du fichier PNG de sortie
        threshold: Seuil de couleur pour considérer comme blanc (0-255)
    """
    try:
        # Ouvrir l'image
        img = Image.open(input_path)
        
        # Convertir en RGBA si nécessaire
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Obtenir les données de pixels
        data = img.getdata()
        
        # Créer une nouvelle liste de pixels
        new_data = []
        for item in data:
            # Si le pixel est blanc ou très proche du blanc, le rendre transparent
            if item[0] > threshold and item[1] > threshold and item[2] > threshold:
                new_data.append((255, 255, 255, 0))  # Transparent
            else:
                new_data.append(item)
        
        # Appliquer les nouvelles données
        img.putdata(new_data)
        
        # Sauvegarder l'image
        img.save(output_path, 'PNG')
        print(f"✅ Logo traité avec succès!")
        print(f"📁 Fichier sauvegardé: {output_path}")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    # Chemins
    input_file = "logo.PNG"
    output_file = "public/logo.png"
    
    # Vérifier que le fichier d'entrée existe
    if not os.path.exists(input_file):
        print(f"❌ Fichier non trouvé: {input_file}")
        exit(1)
    
    # Créer le dossier public s'il n'existe pas
    os.makedirs("public", exist_ok=True)
    
    # Traiter l'image
    print(f"🔄 Traitement du logo: {input_file}")
    remove_white_background(input_file, output_file, threshold=240)
