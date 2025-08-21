from pathlib import Path

import pandas as pd


def test_images_exist() -> None:
    """Test that all sports images exist in the assets/images directory.

    Raises:
        AssertionError: If any image file is missing.

    Example:
        pytest tests/test_images_sports.py
    """
    repo_root = Path(__file__).resolve().parents[1]
    df_sports = pd.read_csv(repo_root / "assets" / "sports.csv")
    missing_images = [
        str(repo_root / "assets" / "images" / f"{sport}.webp")
        for sport in df_sports["sport_id"]
        if not (repo_root / "assets" / "images" / f"{sport}.webp").exists()
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

    from PIL import UnidentifiedImageError

    repo_root = Path(__file__).resolve().parents[1]
    df_sports = pd.read_csv(repo_root / "assets" / "sports.csv")
    unreadable_images = []
    for sport in df_sports["sport_id"]:
        image_path = repo_root / "assets" / "images" / f"{sport}.webp"
        if image_path.exists():
            try:
                with PIL.Image.open(str(image_path)) as img:
                    img.verify()  # Check if image can be opened
            except (UnidentifiedImageError, OSError):
                unreadable_images.append(str(image_path))
    assert not unreadable_images, f"Unreadable images: {', '.join(unreadable_images)}"
