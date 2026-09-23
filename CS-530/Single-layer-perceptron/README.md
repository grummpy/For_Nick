# CS 530 — Single-layer perceptron

This course project classifies a team's game result using `pts`, `elo_i`, and
`win_equiv` from the supplied NBA CSV data.

## Run the assignment program

```bash
python -m pip install -r requirements.txt
python perceptron_model.py
```

When prompted, enter `nbaallelo_small.csv` or `nbaallelo_log.csv`. The program
prints the three feature weights, the bias, and held-out accuracy.

## Reuse the compact helper

```python
import pandas as pd
from quick_perceptron import predict_perceptron, train_perceptron

data = pd.read_csv("nbaallelo_small.csv")
X = data[["pts", "elo_i", "win_equiv"]]
y = data["game_result"].map({"L": 0, "W": 1})
model, scaler = train_perceptron(X, y, learning_rate=0.05, epochs=20_000)
predictions = predict_perceptron(model, scaler, X)
```

## Important modeling note

`pts` is the score in the game being classified. It is a post-game feature, not
a valid feature for a real pre-game forecast. See the [teaching guide](TEACHING_GUIDE.md).
