---
title: "(TBD) Investigation into how frontier MLLMs handle vision"
last_modified_at: 2026-11-02
categories:
  - Blog
tags:
  - Casual
---

We aim to conduct a thorough investigation into how frontier MLLMs handle vision, including their architectures, attention mask, training paradigm and recipes etc.

# Investigated models

- [Kimi K3](https://arxiv.org/pdf/2607.24653v2)

- [DeepSeek-V4.1-Flash](https://arxiv.org/pdf/2609.19969v1)

- [MiMo-V2.6](https://arxiv.org/pdf/2610.11959)

- [Gemma4](https://arxiv.org/pdf/2607.02770)

- [Molmo2](https://openaccess.thecvf.com/content/CVPR2026/papers/Clark_Molmo2_Open_Weights_and_Data_for_Vision-Language_Models_with_Video_CVPR_2026_paper.pdf)

- [Kimi K2.5](https://arxiv.org/pdf/2602.02276)

- [InternVL3.5](https://arxiv.org/pdf/2508.18265)

- [LFM3-VL-2B](https://huggingface.co/LiquidAI/LFM3-VL-2B)

# Thorough Investigations

## Kimi K3: Training vision encoder from scratch for native multimodal capability

### Vision Architecture and Attention

Kimi K3 adopt LLaVA-style vision encoder(MoonViT-V2) + LLM to handle visual inputs.

**MoonViT-V2** is a 27-layer, 401M-parameter ViT, trained **from scratch** with RMSNorm and bias-free projections for stability. It shares parameters across images and videos and supports spatiotemporal attention. Two operations compress visual tokens before the MLP projector:

- Temporal pooling (4×): Groups four consecutive video frames and averages their encoded features at corresponding spatial positions, reducing \(T=4\) to \(T=1\).

- 2×2 pixel shuffle (4×): Concatenates four neighboring spatial tokens along the channel dimension, transforming \((H,W,C)\rightarrow(H/2,W/2,4C)\).
Together, they provide up to 16× token reduction for four-frame video chunks, enabling high-resolution inputs (up to 3584×3584) within K3's 1M-token context.

Two types of attention mask appear here: 
1) For video/image, intra-frame spatial attention and inter-frame temporal attention happen in the vision encoder. According to official implementation, the actual behavior is just full bidirectional attention for vision, which means each token within the video can attend to every tokens within that video. So, I guess that's just a compromise on infra because block-causal mask(causal between frames and bidirectional within each frame) might require extra engineering? 

2) After projection into LLM, all tokens are packed into a single unified sequence where only causal attention is used. Note that bidirectional interaction already happens within vision encoder so this does not prevent temporal-spatial interaction.

My question is, since vision encoder has already done the bidirectional interaction, do we really need the LLM to do attention between visual tokens again which is really expensive? Even more aggresively, we can consider totally freezing vision hidden features so that they remain unchanged between layers and work solely as KV memory.

### Training Paradigm and Recipe

