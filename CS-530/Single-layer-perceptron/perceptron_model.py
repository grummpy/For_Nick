"""Train a single-layer perceptron on NBA game-result records."""

import pandas as pd
from sklearn.linear_model import Perceptron
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


# Load input into a dataframe.
NBA = pd.read_csv(input().strip())

# Encode the game result: loss = 0 and win = 1.
NBA["game_result"] = NBA["game_result"].map({"L": 0, "W": 1})

# Store the predictor columns and target label.
X = NBA[["pts", "elo_i", "win_equiv"]]
y = NBA["game_result"].astype(int)

# Scale numeric input features. Do not scale y: it is a class label.
scaler = StandardScaler()
XScaled = scaler.fit_transform(X)

# Split the data into training and test sets.
XTrain, XTest, yTrain, yTest = train_test_split(
    XScaled, y, test_size=0.3, random_state=123
)

# Initialize and fit the requested perceptron.
classifyNBA = Perceptron(eta0=0.05, max_iter=20000, random_state=42)
classifyNBA.fit(XTrain, yTrain)

# Predict results and report the learned linear-model parameters.
yPred = classifyNBA.predict(XTest)
weightVar = classifyNBA.coef_[0]
weightBias = classifyNBA.intercept_
print(weightVar)
print(weightBias)

# Evaluate the held-out test partition.
score = accuracy_score(yTest, yPred)
print("%.3f" % score)
