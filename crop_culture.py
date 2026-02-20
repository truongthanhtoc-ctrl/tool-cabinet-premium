from PIL import Image

def crop_culture_rows(image_path, output_dir):
    try:
        # Load the image
        img = Image.open(image_path)
        width, height = img.size
        
        # Determine the height for each row (assuming 4 equal rows)
        row_height = height // 4
        
        # Row 1 Image (Right side)
        # We need to crop just the image part from the screenshot.
        # Based on the visual structure, the image takes up roughly the right half in even rows 
        # and left half in odd rows, but let's be more robust.
        # It's safer to crop the whole illustration area or specific coordinates if known.
        # For this task, since the user provided a screenshot of the whole section layout,
        # I will crop each of the 4 illustrative images from this single large screenshot.
        
        # Coordinates are approximate based on standard 16:9 or similar layouts within the rows.
        # Let's try to extract the 4 main photographic elements.
        
        # Row 1: Social Responsibility (Image on Right)
        # Approximate crop for the image on the right side of the first row
        img1 = img.crop((width // 2, 0, width, row_height)) 
        # Refine: remove white margins if possible -> actually let's just save the crop and use CSS to fit
        img1.save(f"{output_dir}/culture-social.png")
        
        # Row 2: Talent First (Image on Left)
        img2 = img.crop((0, row_height, width // 2, row_height * 2))
        img2.save(f"{output_dir}/culture-talent.png")

        # Row 3: Thanksgiving Party (Image on Right)
        img3 = img.crop((width // 2, row_height * 2, width, row_height * 3))
        img3.save(f"{output_dir}/culture-thanksgiving.png")

        # Row 4: Morning Exercise (Image on Left)
        img4 = img.crop((0, row_height * 3, width // 2, row_height * 4))
        img4.save(f"{output_dir}/culture-exercise.png")
        
        print("Saved 4 culture images.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    image_path = "public/assets/corporate-culture-rows.png"
    output_dir = "public/assets"
    crop_culture_rows(image_path, output_dir)
