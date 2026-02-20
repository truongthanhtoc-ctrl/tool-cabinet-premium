from PIL import Image

def crop_social_contribution(image_path, output_dir):
    try:
        # Load the image
        img = Image.open(image_path)
        img_width, img_height = img.size
        
        # Based on the screenshot, we have 6 cards in a row.
        # We need to approximate the crop area for the cards row.
        # The cards seem to occupy the middle horizontal band of the image.
        
        # Let's try to slice the image into 6 roughly equal columns, ignoring header/footer for now
        # Or better, just crop the 6 main images from the screenshot.
        
        # Assuming the screenshot captures the full width section.
        # The cards row starts around y=0.3*height and ends around y=0.7*height (rough guess based on visual)
        # But this is risky without precise coords.
        
        # Since I can't interactively measure, I will create a robust slicing strategy.
        # I'll divide the width by 6 to get 6 columns.
        # And I'll take a central crop from each column to avoid edges.
        
        card_width = img_width / 6
        # Let's assume the cards are vertically centered in the image provided
        # The uploaded image contains header text and footer contact section too.
        # Let's guess the cards are in the middle 50% of the height? 
        # Actually in the screenshot provided, the cards are roughly in the vertical center band.
        
        # Let's crop a band from 20% height to 60% height to capture the card images roughly
        # This is a heuristic.
        
        top = int(img_height * 0.22)
        bottom = int(img_height * 0.55)
        
        # Margins (left/right padding in the screenshot)
        # It looks like there is some padding. Let's start from 2% width to 98% width
        left_margin = int(img_width * 0.015)
        right_margin = int(img_width * 0.985)
        available_width = right_margin - left_margin
        
        single_card_width = available_width / 6
        
        for i in range(6):
            left = int(left_margin + i * single_card_width)
            right = int(left + single_card_width)
            
            # Additional small trim to remove card whitespace/padding from the crop
            # We want the photo part primarily.
            crop_left = left + 10
            crop_right = right - 10
            
            # Crop
            card_img = img.crop((crop_left, top, crop_right, bottom))
            card_img.save(f"{output_dir}/social-contribution-{i+1}.png")
            
        print("Saved 6 social contribution images.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    image_path = "public/assets/social-contribution-row.png"
    output_dir = "public/assets"
    crop_social_contribution(image_path, output_dir)
