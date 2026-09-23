# Single-layer perceptron: teaching guide

**Version:** 1.0 · **Review status:** verified against cited sources on 2026-09-22

## What this project uses

A single-layer perceptron is a linear binary classifier. It multiplies each
input by a learned weight, adds a bias, and returns a class based on which side
of the decision boundary the example falls. Here, the inputs are `pts`,
`elo_i`, and `win_equiv`; `W` is encoded as 1 and `L` as 0.

The implementation is [`sklearn.linear_model.Perceptron`](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Perceptron.html).
scikit-learn documents it as a linear classifier; `eta0` is its constant
learning rate and `max_iter` is the maximum number of passes through the data.

It does **not** estimate a probability of winning, discover nonlinear patterns,
or make a valid pre-game forecast from post-game inputs. `pts` is known only
after a game; using it before tipoff would be target leakage.

## How to use it

1. Read a CSV containing three numeric predictors and a `W`/`L` label.
2. Encode labels as 1/0, scale numeric predictors, and split training from test data.
3. Fit `Perceptron(eta0=0.05, max_iter=20000)` on the training partition.
4. Inspect `coef_` (input weights) and `intercept_` (bias), then score held-out predictions.

Scaling helps an iterative linear learner because `pts`, Elo, and
win-equivalent values have different ranges. Do **not** standardize the 0/1
target: it is a class label, not a continuous feature. The compact helper keeps
the scaler with the model so new input receives the same transformation.

## Benefits and limits

| Benefits | Limits |
|---|---|
| Fast, small, and easy to inspect: three weights plus one bias. | Only one straight decision boundary; it cannot learn nonlinear patterns. |
| Can update incrementally with `partial_fit`. | Hard class decisions, not calibrated probabilities. |
| Excellent for learning scaling, train/test separation, and leakage. | Sensitive to feature quality, class imbalance, and learning-rate choice. |
| Useful for simple, linearly separable classification. | Training can depend on data order and may not converge on nonseparable classes. |

## When it makes sense

Use a perceptron as a transparent baseline, low-memory online binary classifier,
or lesson about linear decision boundaries. Prefer another method when you need
probabilities, nonlinear interactions drive the outcome, or a high-stakes model
needs broader validation. For a genuine NBA forecast, replace post-game score
with data known before tipoff and use time-ordered evaluation.

## Alternatives

| Option | Capability fit | Ease / integration | Cost & local fit | Choose it when |
|---|---|---|---|---|
| Perceptron | Linear hard-class baseline | Very easy; scikit-learn API | BSD-licensed; local | Teaching or fast, transparent binary classification. |
| [LogisticRegression](https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression) | Linear classifier with probabilities | Easy; same ecosystem | BSD; local | You need probabilities and regularization. |
| [SGDClassifier](https://scikit-learn.org/stable/modules/sgd.html) | Scalable linear/online losses | Moderate tuning | BSD; local | You need alternate losses, regularization, or streaming data. |
| [RandomForestClassifier](https://scikit-learn.org/stable/modules/ensemble.html#forests-of-randomized-trees) | Nonlinear interactions | Easy API, less interpretable | BSD; local | Tabular nonlinearities matter. |
| [MLPClassifier](https://scikit-learn.org/stable/modules/neural_networks_supervised.html) | Multi-layer nonlinear network | More tuning and data | BSD; local | Enough data supports a justified nonlinear model. |

The BSD/local statements are **FACTS** supported by [scikit-learn's license](https://github.com/scikit-learn/scikit-learn/blob/main/COPYING).
The selection guidance is a **RECOMMENDATION** for this course project.

## Projects and industry context

The perceptron is historically important: the U.S. Naval Research Laboratory
documents Frank Rosenblatt's Mark I Perceptron as an early learning machine.
Modern teams more commonly call deployed descendants a *linear classifier* or
*online learner* than a textbook one-layer perceptron. These are inspectable
examples from the same lightweight-classification family:

- **Apache Mahout** maintains online logistic regression for streaming
  classification. This shows the industry pattern of a simple linear model for
  high-throughput updates; it is **not** a claim that Mahout defaults to a
  textbook perceptron. [Documentation](https://mahout.apache.org/docs/latest/algorithms/algorithms.html)
- **Vowpal Wabbit** is an open-source system for fast online learning in
  contextual-bandit and supervised workflows. It provides a production lineage
  for sparse, large-scale linear models but is broader than a perceptron.
  [Project wiki](https://github.com/VowpalWabbit/vowpal_wabbit/wiki)
- **Optical character recognition and simple pattern classification** are
  classic perceptron demonstrations; the original Mark I context is documented
  by the [U.S. Naval Research Laboratory](https://www.nrl.navy.mil/Media/News/Article/2563886/mark-i-perceptron/).

**Inference:** These sources support using a perceptron as an instructional
baseline. They do not prove that a named company currently runs this exact NBA
model.

## Learning path

1. **Orientation:** run the program on `nbaallelo_small.csv`; identify weights, bias, and accuracy.
2. **Guided exercise:** remove `pts`, compare accuracy, and explain why it better resembles a pre-game study.
3. **Project task:** replace the perceptron with logistic regression and compare probability output.
4. **Verification exercise:** refactor to fit the scaler only on training data and use time-aware validation.

### Glossary

- **Weight:** learned multiplier for one input.
- **Bias/intercept:** learned constant added to the weighted sum.
- **Epoch:** one pass through training records; `max_iter` is an upper bound.
- **Feature scaling:** standardizing feature ranges, commonly zero mean and unit variance.
- **Target leakage:** using information unavailable when a prediction is meant to be made.

## Sources

1. [scikit-learn Perceptron API](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Perceptron.html)
2. [scikit-learn linear-model guide](https://scikit-learn.org/stable/modules/linear_model.html)
3. [scikit-learn preprocessing guide](https://scikit-learn.org/stable/modules/preprocessing.html)
4. [U.S. Naval Research Laboratory: Mark I Perceptron](https://www.nrl.navy.mil/Media/News/Article/2563886/mark-i-perceptron/)
5. [Apache Mahout algorithms](https://mahout.apache.org/docs/latest/algorithms/algorithms.html)
6. [Vowpal Wabbit project wiki](https://github.com/VowpalWabbit/vowpal_wabbit/wiki)

## Open questions

The supplied CSV does not establish whether each feature is strictly pre- or
post-game. Before real deployment, define the prediction time, remove
unavailable features, examine class balance, and evaluate against a time-ordered
holdout.
