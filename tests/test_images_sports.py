from pathlib import Path

import pandas as pd


def test_images_exist() -> None:
    """Test that all sports images exist in the assets/images directory.

    Raises:
        AssertionError: If any image file is missing.

    Example:
        pytest tests/test_images_sports.py
    """
    df_sports = pd.read_csv("assets/sports.csv")
    missing_images = [
        f"assets/images/{sport}.webp"
        for sport in df_sports["sport_id"]
        if not Path(f"assets/images/{sport}.webp").exists()
    ]
    assert not missing_images, f"Missing images: {', '.join(missing_images)}"


def test_images_are_readable() -> None:
    """Test that all sports images are readable (not corrupted or inaccessible).

    Raises
    ------
    AssertionError
        If any image file cannot be opened for reading.

    Example
    -------
    pytest tests/test_images_sports.py
    """
    import PIL.Image

    df_sports = pd.read_csv("assets/sports.csv")
    unreadable_images = []
    for sport in df_sports["sport_id"]:
        image_path = f"assets/images/{sport}.webp"
        if Path(image_path).exists():
            try:
                with PIL.Image.open(image_path) as img:
                    img.verify()  # Check if image can be opened
            except Exception:
                unreadable_images.append(image_path)
    assert not unreadable_images, f"Unreadable images: {', '.join(unreadable_images)}"
