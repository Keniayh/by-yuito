# Modelo para quitar el fondo

`silueta.onnx` (44 MB) es el modelo "silueta" distribuido por el proyecto
[rembg](https://github.com/danielgatis/rembg) (licencia MIT, ver `LICENSE-rembg.txt`):
una versión reducida de U²-Net (Qin et al., licencia Apache-2.0).
Se ejecuta en el navegador del panel con onnxruntime-web; las fotos no salen del dispositivo
hasta que se suben a Supabase.
SHA-256 (primeros 16): 75da6c8d2f8096ec

`isnet-q8.onnx` (44 MB): ISNet «isnet-general-use» (DIS, Qin et al., licencia Apache-2.0), distribuido
por rembg, cuantizado a 8 bits con `onnxruntime.quantization.quantize_dynamic` (QUInt8) para reducirlo
de 179 MB a 44 MB. SHA-256 (primeros 16): f1b1c6f7656e5326
