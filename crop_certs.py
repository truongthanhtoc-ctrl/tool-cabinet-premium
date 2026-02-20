from PIL import Image

def crop_certificates(image_path, output_dir):
    try:
        # Load the image
        img = Image.open(image_path)
        width, height = img.size

        # Assuming the image contains 3 certificates arranged horizontally
        # We'll split the image into 3 equal parts
        
        # Calculate width of each certificate
        cert_width = width // 3
        
        # Crop 1: ISO 14001:2015 (Left)
        # Left, Top, Right, Bottom
        crop1 = img.crop((0, 0, cert_width, height))
        crop1.save(f"{output_dir}/iso14001.png")
        print("Saved iso14001.png")

        # Crop 2: ISO 45001:2018 (Center)
        crop2 = img.crop((cert_width, 0, cert_width * 2, height))
        crop2.save(f"{output_dir}/iso45001.png")
        print("Saved iso45001.png")

        # Crop 3: ISO 9001:2015 (Right)
        crop3 = img.crop((cert_width * 2, 0, width, height))
        crop3.save(f"{output_dir}/iso9001.png")
        print("Saved iso9001.png")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    image_path = "C:/Users/simon/.gemini/antigravity/brain/e84becd7-0a8c-48d8-b4e7-a69563d40fcc/uploaded_media_1770113882241.png"
    output_dir = "public/assets/certificates"
    crop_certificates(image_path, output_dir)
