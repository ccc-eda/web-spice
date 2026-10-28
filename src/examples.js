const D = '.model dmod d is=1e-14 n=1.05\n';
export const EX = [
['分壓器與並聯負載（.op）', '直流工作點：R2 與 R3 並聯後與 R1 分壓，輸出應為 4 V。', `Voltage divider
V1 in 0 DC 12
R1 in out 10k
R2 out 0 10k
R3 out 0 10k
.op`],
['RC 充放電（.tran）', '時間常數 τ = RC = 1 ms，輸出以指數曲線追隨方波。', `RC step response
V1 in 0 PULSE(0 5 0 1n 1n 10m 20m)
R1 in out 1k
C1 out 0 1u
.tran 20u 20m
.plot tran v(in) v(out)`],
['串聯 RLC 振鈴（.tran）', '欠阻尼二階系統（Q≈3.2），共振頻率約 503 Hz。', `Series RLC ringing
V1 in 0 PULSE(0 1 0 1n 1n 5m 10m)
R1 in a 10
L1 a out 10m
C1 out 0 10u
.tran 5u 4m
.plot tran v(in) v(out)`],
['RC 低通濾波器 Bode 圖（.ac）', '截止頻率 1 kHz，增益在截止點為 −3 dB、相位 −45°。', `RC low-pass
V1 in 0 AC 1
R1 in out 1k
C1 out 0 159n
.ac dec 40 10 1meg
.plot ac v(out)`],
['RLC 帶通濾波器（.ac）', '中心頻率約 1.59 kHz，Q = 2。', `RLC band-pass
V1 in 0 AC 1
L1 in a 10m
C1 a out 1u
R1 out 0 50
.ac dec 60 100 100k
.plot ac v(out)`],
['並聯 RLC 諧振（.ac）', '以 1 A 電流源驅動：諧振時阻抗等於 R = 1 kΩ（60 dB）。', `Parallel RLC resonance
I1 0 out AC 1
R1 out 0 1k
L1 out 0 10m
C1 out 0 1u
.ac dec 60 100 100k
.plot ac v(out)`],
['半波整流（.tran）', '矽二極體（Newton-Raphson 求解），輸出被削去負半週與約 0.7 V。', `Half-wave rectifier
${D}V1 in 0 SIN(0 5 60)
D1 in out dmod
R1 out 0 1k
.tran 100u 50m
.plot tran v(in) v(out)`],
['橋式整流加濾波電容（.tran）', '四個二極體與 100 µF 電容，可觀察漣波電壓。', `Bridge rectifier with filter
${D}V1 s b SIN(0 10 60)
R2 s a 5
D1 a p dmod
D2 b p dmod
D3 0 a dmod
D4 0 b dmod
C1 p 0 100u
R1 p 0 1k
.tran 100u 80m
.plot tran v(a) v(p)`],
['二極體 I-V 曲線（.dc）', '掃描電源電壓，經 10 Ω 限流後量測二極體電流（膝點約 0.7 V）。', `Diode I-V curve
${D}V1 in 0 0
R1 in a 10
D1 a 0 dmod
.dc V1 0 1.5 0.01
.plot dc i(r1)`],
['反相放大器（.tran）', '理想運算放大器（E 元件，增益 1e5），閉迴路增益 −4.7。', `Inverting amplifier
V1 in 0 SIN(0 0.5 1k)
R1 in n 1k
R2 n out 4.7k
E1 out 0 0 n 1e5
.tran 10u 3m
.plot tran v(in) v(out)`],
['雙向二極體削波器（.tran）', '兩顆反向並聯二極體把波形限制在約 ±0.7 V。', `Diode clipper
${D}V1 in 0 SIN(0 5 1k)
R1 in out 1k
D1 out 0 dmod
D2 0 out dmod
.tran 5u 3m
.plot tran v(in) v(out)`],
['RC 微分電路（.tran）', '高通 RC 在方波邊緣產生尖脈衝，τ = 0.1 ms。', `RC differentiator
V1 in 0 PULSE(0 5 0 1n 1n 1m 2m)
C1 in out 100n
R1 out 0 1k
.tran 5u 4m
.plot tran v(in) v(out)`],
['惠斯登電橋（.op）', '含橋接電阻的五電阻電橋，列出所有節點電壓與電源電流。', `Wheatstone bridge
V1 a 0 10
R1 a b 1k
R2 a c 2k
R3 b 0 2k
R4 c 0 3k
R5 b c 500
.op`],
];
