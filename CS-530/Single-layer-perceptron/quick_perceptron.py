"""A small reusable single-layer perceptron helper."""

from sklearn.linear_model import Perceptron
from sklearn.preprocessing import StandardScaler


def train_perceptron(features, labels, learning_rate=0.05, epochs=20_000):
    """Fit a scaled binary perceptron and return ``(model, scaler)``."""
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(features)
    model = Perceptron(
        eta0=learning_rate, max_iter=epochs, random_state=42
    )
    model.fit(scaled_features, labels)
    return model, scaler


def predict_perceptron(model, scaler, features):
    """Predict classes using the scaler returned by ``train_perceptron``."""
    return model.predict(scaler.transform(features))
