import json
import os

class HyperCaptionsBridge:
    def __init__(self, styles_path=None):
        if styles_path is None:
            # Use relative path to styles.json in the same directory
            styles_path = os.path.join(os.path.dirname(__file__), "styles.json")

        with open(styles_path, "r") as f:
            self.styles = json.load(f)["styles"]

    def synthesize(self, captions, style_id, brolls=None):
        """
        Converts CapGen captions and B-roll clips into a Hyperframes Composition.
        """
        if style_id not in self.styles:
            raise ValueError(f"Style {style_id} not found in registry.")

        style = self.styles[style_id]

        # Hyperframes Project Structure
        project = {
            "composition": {
                "name": "Automated Captions",
                "width": 1080,
                "height": 1920,
                "fps": 30,
                "elements": []
            }
        }

        # Add captions as text elements
        for i, cap in enumerate(captions):
            element = {
                "id": f"cap_{i}",
                "type": "text",
                "content": cap["text"],
                "style": {
                    "font": style["font"],
                    "color": style["color"],
                    "stroke": style["stroke"],
                    "strokeWidth": style["strokeWidth"],
                    "fontSize": 72,
                    "textAlign": "center"
                },
                "timing": {
                    "start": cap["start"],
                    "end": cap["end"]
                },
                "animation": style["animation"]
            }
            project["composition"]["elements"].append(element)

        # Add B-roll as video elements
        if brolls:
            for i, broll in enumerate(brolls):
                element = {
                    "id": f"broll_{i}",
                    "type": "video",
                    "src": broll.get("previewUrl"),
                    "timing": {
                        "start": broll.get("start"),
                        "end": broll.get("end")
                    },
                    "layer": 0 # B-roll is background
                }
                project["composition"]["elements"].append(element)

        return project

if __name__ == "__main__":
    mock_captions = [
        {"start": 0.5, "end": 2.0, "text": "Welcome to the Future!"},
        {"start": 2.1, "end": 4.0, "text": "Powered by Hyperframes."}
    ]
    bridge = HyperCaptionsBridge()
    result = bridge.synthesize(mock_captions, "mr-beast-style")
    print(json.dumps(result, indent=2))
