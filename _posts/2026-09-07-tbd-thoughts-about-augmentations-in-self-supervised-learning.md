---
title: "Thoughts about augmentations in self-supervised learning"
last_modified_at: 2026-10-17
categories:
  - Blog
tags:
  - Formal
  - Idea
---

Recently a paper on self-supervised learning on video data has come out: [LeVJEPA](https://arxiv.org/pdf/2608.27395) .

The main idea is to basically align the invariance+distribution regularization (anti-collapse) paradigm in [LeJEPA](https://arxiv.org/abs/2511.08544) to video representation learning. Given that videos are usually very redundant especially in temporally consecutive frames, they apply very aggressive random masking (95% masking ratio) for efficiency.

The results are quite convincing with fairly strong performance in terms of action recognition, motion classification and object recognition. Yet my main concern when I first looked at it was dense performance: such aggressive token dropping would very likely force the model to learn information that is commonly visible both spatially and temporally, which might lose spatial structure. And indeed, the evaluation results suggest this:


![image](/assets/media/2026-10-03-c86ac502-2d6c-4bd6-954c-c6efe52862ea.png)


Essentially, we can think of SSL as learning what is invariant between different augmentations, recall the very basic definition of SSL with Joint Embedding Architecture:

\[
p^\star = \arg\min_p
\mathbb E_{\substack{x\sim\mathcal D\\a_1,a_2\sim\pi}}
\left[
\left\|
p(a_1(x))-f_{\theta_2}(a_2(x))
\right\|_2^2
\right]
\]

Here $p$ is the student/predictor, $\theta_2$ is the teacher/context encoder and $pi$ is the augmentation policy. Thus under square L2 loss, the minimum achievable expected prediction error would be:

\[
\mathcal L_\pi^\star
=
\mathbb E\left[
\left\|
f_{\theta_2}(V_2)
-
\mathbb E[f_{\theta_2}(V_2)\mid V_1]
\right\|_2^2
\right]
\]


Hence, given a fixed teacher, the optimal predictor cannot recover the unpredictable part of target representation from the context. Therefore, the augmentation policy fundamentally shapes what the model can learn. For example, by predicting full views' representation from partially masked views, we are assuming that the patches are quite redundant such that after masking we still have sufficient context information. The same applies to MultiCrop where the case might become even more extreme: the model has to sometimes infer the full image from very crops that correspond to very small area of original image which might not even contain for example the main object. 