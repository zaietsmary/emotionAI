import tensorflow as tf
from pathlib import Path

_model_cache = None

def spatial_attention_block(inputs):
    """
    Placeholder for the custom Spatial Attention layer.
    Required for loading models that were trained with this custom layer.
    """
    return inputs

def f1_score(y_true, y_pred):
    """
    Placeholder for the custom F1-score metric.
    Required for loading models that included this metric during compilation.
    """
    return 0

def find_model_path() -> str:
    """
    Locates the .keras model file within the project structure.
    It searches by navigating up from the current utility file to the 
    project root and looking into the 'models' directory.
    Returns:
        str: Absolute path to the model file if found, otherwise None.
    """
    current_file = Path(__file__).resolve()
    potential_path = current_file.parents[2] / "models" / "model.keras"

    if potential_path.exists():
        return str(potential_path)
    alternative_path = current_file.parents[3] / "models" / "model.keras"
    if alternative_path.exists():
        return str(alternative_path)
        
    return None

def get_model():
    """
    Retrieves the ConvNeXt model from memory (cache) or loads it from disk.
    This function implements the Singleton pattern to ensure the heavy model 
    file is only loaded once during the application's lifecycle.
    Returns:
        tf.keras.Model: The loaded Keras model instance, or None if loading fails.
    """
    global _model_cache
    
    if _model_cache is not None:
        return _model_cache

    model_path = find_model_path()
    
    if not model_path:
        print("Model file not found!")
        return None

    try:
        print(f"Loading model from: {model_path}")
        _model_cache = tf.keras.models.load_model(
            model_path,
            custom_objects={
                "spatial_attention_block": spatial_attention_block,
                "f1_score": f1_score
            },
            compile=False
        )
        print("Model loaded successfully!")
        return _model_cache
    except Exception as e:
        print(f"Error during model loading: {e}")
        return None