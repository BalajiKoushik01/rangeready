# ◈ RANGEREADY
### Complete Software Description & UI/UX Specification
##### `v2.0` · `GVB Tech Solutions` · `For Software & Product Development Teams`

---

> **What this document is:** The complete feature description, measurement specifications, UI/UX design system, and screen-by-screen breakdown for the RangeReady RF Test Automation Platform. Every feature listed here must be built. Every UI rule listed here must be followed. This is the single source of truth.

---

## 📡 Table of Contents

| # | Section |
|---|---------|
| 1 | [Product Vision & Design Philosophy](#1-product-vision--design-philosophy) |
| 2 | [Complete Measurement Suite](#2-complete-measurement-suite) |
| 3 | [Design System — Liquid Glass Light Theme](#3-design-system--liquid-glass-light-theme) |
| 4 | [Application Layout & Navigation](#4-application-layout--navigation) |
| 5 | [Screen-by-Screen Specification](#5-screen-by-screen-specification) |
| 6 | [Chart & Visualization System](#6-chart--visualization-system) |
| 7 | [Component Library](#7-component-library) |
| 8 | [Interaction & Animation Rules](#8-interaction--animation-rules) |
| 9 | [Report System Specification](#9-report-system-specification) |
| 10 | [Accessibility & Performance](#10-accessibility--performance) |

---

## 1. Product Vision & Design Philosophy

### What RangeReady Must Feel Like

Every engineer who opens RangeReady for the first time should feel two things simultaneously:

1. **Relief** — "Finally, something that doesn't look like it was built in 2003."
2. **Trust** — "This is serious, precise, professional equipment."

RangeReady is not a utility tool with a pretty skin. It is a precision instrument interface. The UI must communicate accuracy, calm, and intelligence — the same way a premium oscilloscope or a well-designed aircraft instrument panel does.

### The Three UI Laws

**Law 1 — Everything Visible Must Be Functional**
No decorative elements that don't carry information. Every pixel earns its place. If it's on screen, it does something or tells the engineer something.

**Law 2 — Data is the Hero**
Charts, measurements, and values are front and centre always. Navigation, controls, and chrome are secondary. The engineer's eyes must land on the data first, always.

**Law 3 — Zero Learning Curve**
An RF engineer who has never seen RangeReady before must be able to complete a full test sequence within 10 minutes of first opening the app — without reading a manual. Every action must be where the engineer expects it.

### Design Aesthetic — Liquid Glass Light

The visual language is **Liquid Glass** on a warm white foundation:

- **Background:** Warm off-white — not clinical white, not grey. Think: natural light on a clean laboratory bench.
- **Surfaces:** Frosted glass cards with subtle translucency, soft shadow, and a thin luminous border — as if light passes through the panel from behind.
- **Depth:** Three distinct depth layers: background, surface, elevated. Each has a different blur intensity and shadow weight.
- **Accent:** A single precise blue — electric, crisp, used only for primary actions and live data traces.
- **Status colours:** Emerald green (pass), coral red (fail), warm amber (warning/active). Never neon. Always readable.

---

## 2. Complete Measurement Suite

This section defines every measurement RangeReady must support. Each measurement is described with: what it is, why it matters for ISRO/defence labs, what parameters the engineer configures, and what the output looks like.

---

### 2.1 S-Parameters (Scattering Parameters)

S-parameters describe how RF energy travels through a device. They are the foundation of all RF component characterisation. All four S-parameters are complex numbers — they have both magnitude (in dB) and phase (in degrees) at every frequency point.

---

#### S11 — Input Return Loss / Reflection Coefficient

**What it measures:**
How much of the signal fed into Port 1 is reflected back instead of being absorbed or transmitted. A perfect antenna absorbs all the signal — S11 = −∞ dB. A completely mismatched antenna reflects everything back — S11 = 0 dB.

**Why ISRO labs use it:**
S11 is the primary qualification test for every antenna in the ISRO supply chain. TTC antennas, S-band feeds, UHF antennas — all are specified with an S11 limit (typically better than −10 dB across the operating band). It directly tells you whether the antenna is working or not.

**What the engineer configures:**
- Frequency start and stop (Hz)
- Resolution Bandwidth — RBW (Hz): controls measurement resolution vs speed
- Number of sweep points: 101 to 3001 (more points = finer frequency resolution)
- Reference level (dBm): sets the top of the Y-axis
- Upper limit line (dB): the maximum allowable S11 value (e.g., −10 dB)
- Lower limit line (dB): minimum if applicable
- DUT name and serial number

**What RangeReady shows:**
- Live frequency plot: X-axis = frequency (MHz or GHz), Y-axis = S11 magnitude (dB)
- Limit lines overlaid as dashed red/green lines
- Trace coloured green (pass) or red (fail) automatically
- Key metrics extracted automatically:
  - Minimum S11 value and the frequency at which it occurs
  - −10 dB bandwidth (frequency range where S11 < −10 dB)
  - Centre frequency of the −10 dB bandwidth
  - VSWR derived from S11 at every frequency point
  - Return loss at the centre frequency
- Pass/Fail badge: PASS if all points are within limits, FAIL otherwise
- Smith Chart view toggle: shows S11 data plotted on a standard Smith Chart for impedance analysis

---

#### S21 — Forward Transmission / Insertion Loss / Gain

**What it measures:**
How much signal passes from Port 1 to Port 2. For a filter: S21 in the passband should be close to 0 dB (everything passes through). In the stopband it should be very negative (signal is rejected). For an amplifier: S21 will be positive in dB (gain). For a cable or connector: S21 will be slightly negative (insertion loss).

**Why ISRO labs use it:**
S21 characterises every passive and active component in the RF chain — filters, diplexers, cables, amplifiers, power dividers, directional couplers. It tells you if a filter is passing the right frequencies and rejecting the wrong ones. Critical for TTC transponder feed networks and S-band payload feed systems.

**What the engineer configures:**
- All the same as S11 plus:
- Tracking generator output level (dBm): power level of the stimulus signal (−40 to 0 dBm)
- Normalisation mode: thru normalisation before DUT insertion
- Passband limits: upper and lower dB limits for the passband region
- Stopband limit: minimum rejection required in the stopband
- Passband frequency range: define which frequencies are passband vs stopband

**What RangeReady shows:**
- Frequency plot with S21 magnitude in dB vs frequency
- Separate limit lines for passband and stopband regions on the same chart
- Key metrics extracted automatically:
  - Minimum insertion loss in passband
  - Maximum insertion loss in passband (passband ripple)
  - Passband ripple = max − min (should be < 1 dB for most ISRO specs)
  - 3 dB cutoff frequencies (lower and upper)
  - Stopband rejection value at specified frequencies
  - Centre frequency and 3 dB bandwidth

---

#### S22 — Output Return Loss

**What it measures:**
The same as S11 but looking into Port 2 (the output). Tells you how well the output port is matched to the system impedance (50 Ω typically). Critical for amplifiers — a poorly matched output reflects power back into the amplifier, causing instability.

**Configuration:** Same as S11, but from the output side. On a 1-port spectrum analyser with tracking generator, the DUT must be reversed (Port 2 becomes the input).

RangeReady must guide the engineer through the physical reversal with a step-by-step prompt: "Turn the DUT around. Connect what was Port 2 to the tracking generator output. Click confirm."

**Output:** Same chart format as S11. Key metrics: minimum S22, output impedance match quality, VSWR at output.

---

#### S12 — Reverse Isolation / Reverse Transmission

**What it measures:**
Signal leaking backwards from Port 2 to Port 1. For an amplifier, this is reverse isolation — how well the amplifier blocks signals from feeding backward through the device. For a diplexer, this is the isolation between the transmit and receive paths. Higher absolute value of S12 (more negative dB) = better isolation.

**Why it matters:**
In ISRO TTC systems, the transmitter and receiver share the same antenna through a diplexer. S12 (isolation between TX and RX ports) determines whether the high-power transmitter signal "leaks" into the sensitive receiver, potentially damaging it or causing interference. ISRO typically specifies > 50 dB isolation.

**Configuration:** Same as S21 but with DUT reversed.

**Output:** Frequency plot showing S12 magnitude. Key metric: minimum isolation value and whether it meets the specified dB limit across the band.

---

#### VSWR — Voltage Standing Wave Ratio

**What it measures:**
VSWR is mathematically derived from S11 but expressed as a ratio (e.g., 1.5:1) rather than in dB. It directly tells an engineer how much power is being lost to reflections. VSWR of 1:1 = perfect match, no reflected power. VSWR of 2:1 = 11% of power reflected. VSWR of 3:1 = 25% reflected.

**Why ISRO uses VSWR instead of S11:**
Many legacy ISRO qualification documents specify limits in VSWR rather than dB return loss. Both describe the same physical phenomenon. RangeReady automatically computes and displays both simultaneously from the same measurement.

**The formula RangeReady computes:**
```
Γ (reflection coefficient magnitude) = 10^(S11_dB / 20)
VSWR = (1 + Γ) / (1 − Γ)
```

**Output:** A separate VSWR vs frequency chart (Y-axis: VSWR ratio, not dB). Limit line shown as a horizontal line (e.g., VSWR = 2.0). Pass if all VSWR values are below the limit.

---

### 2.2 Gain Measurements

---

#### Absolute Gain

**What it measures:**
The ratio of output power to input power for an amplifier, expressed in dB. Positive value = amplification. Negative value = loss. A Low Noise Amplifier (LNA) might have gain of +20 dB. A filter might have gain of −1 dB (insertion loss). S21 in magnitude IS the gain — they are the same measurement expressed differently.

**Why it matters:**
Every active component in an RF system — LNAs, power amplifiers, pre-amplifiers — must be characterised for gain to verify it meets specification. ISRO LNAs in satellite ground stations are specified for gain flatness across the operating band.

**What RangeReady adds beyond S21:**
- Gain at a specific frequency (single-point gain, not swept)
- Gain flatness: the peak-to-peak variation in gain across the specified band
- Gain compression indication: if gain is measured at multiple power levels, show the trend toward 1 dB compression
- Temperature-corrected gain display: if ambient temperature sensor is connected

**Configuration parameters:**
- Input power level (from tracking generator or signal generator)
- Frequency range
- Gain flatness limit: ± dB allowed (e.g., ±1 dB)
- Absolute gain minimum and maximum limits

**Output chart:** Gain (dB) vs frequency. Flat as possible = good. Drooping edges = poor performance. Annotations showing gain at centre frequency, minimum gain, maximum gain, and flatness value.

---

#### Gain Flatness

**What it measures:**
The variation of gain across a frequency band. Calculated as: Gain_max − Gain_min within the specified band. A perfectly flat amplifier would have 0 dB flatness. Typical ISRO specs: ±0.5 dB or ±1 dB across the operating band.

**Why it matters:**
A wideband LNA with good absolute gain but poor flatness will amplify some frequencies more than others — distorting the received signal. In satellite TTC systems, gain flatness directly affects signal quality and bit error rate.

**RangeReady output:**
- Gain vs frequency chart with mean gain reference line
- Flatness band shown as shaded region around the mean (±limit dB)
- Automatic calculation: flatness value in ±dB
- Worst-case frequency: the frequency where gain deviates most from the mean
- Pass/fail against the specified flatness limit

---

### 2.3 Phase Measurements

---

#### Phase Response (S21 Phase)

**What it measures:**
The phase shift introduced by a component at each frequency. A cable introduces phase shift that increases linearly with frequency. A filter introduces phase shift that changes rapidly near the cutoff frequencies. Phase is measured in degrees (0° to ±180°) at each frequency point.

**Why it matters:**
In wideband systems like ISRO S-band transponders and ranging payloads, phase distortion can cause errors in the ranging measurement (the precise distance measurement to the spacecraft). Phase response must be flat and linear for correct operation.

**Configuration:**
- Frequency range
- Phase unwrapping: on/off (unwrapping removes the ±180° discontinuities to show the continuous phase trend)
- Reference phase: subtract a reference measurement to show differential phase
- Phase limit: maximum allowable phase variation (degrees) across the band

**Output:**
- Phase (degrees) vs frequency chart
- Unwrapped phase option: shows cumulative phase shift without discontinuities
- Key metric: total phase variation across band

---

#### Group Delay

**What it measures:**
Group delay is the negative derivative of phase with respect to angular frequency. In simple terms: it tells you how long different frequency components take to travel through the device. Units: nanoseconds (ns).

Flat group delay = all frequencies arrive at the output at the same time = no signal distortion.
Varying group delay = different frequencies arrive at different times = signal distortion.

**Why it matters for ISRO:**
Group delay variation is critical for:
- TTC transponders: ranging measurements are based on precise signal timing
- Wideband feeds: any group delay variation spreads out pulses in time
- Diplexers and filters: steep filter edges always introduce group delay peaking near cutoff

ISRO qualification documents typically specify group delay variation < 5 ns across the transponder passband.

**How RangeReady computes it:**
Group delay is derived from the phase measurement:
```
Group Delay (seconds) = −dφ/dω = −(1/2π) × dφ/df
```
This requires numerical differentiation of the phase data. RangeReady applies a Savitzky-Golay smoothing filter before differentiation to reduce noise amplification.

**Configuration:**
- Frequency range
- Smoothing window for numerical differentiation (number of points)
- Group delay limit: maximum variation in ns across the band

**Output:**
- Group delay (ns) vs frequency chart
- Key metrics: mean group delay, peak-to-peak variation, worst-case frequency
- Pass/fail against the specified variation limit

---

#### Insertion Phase

**What it measures:**
The absolute phase of S21 at a specific frequency. Used to verify that a component introduces the correct phase shift at the design frequency. Useful for phased array antenna elements where each element must have a precisely controlled phase contribution.

**Output:** Single value in degrees at the specified frequency, with tolerance check.

---

### 2.4 Attenuation Measurements

---

#### Insertion Loss / Attenuation

**What it measures:**
How much signal power is lost passing through a passive component. Cables, connectors, filters, attenuators, switches — all introduce insertion loss. Measured in dB. Positive number = loss. (Note: S21 magnitude = gain for active devices, but for passive devices the S21 magnitude expressed as a positive loss value is called insertion loss.)

**Why it matters:**
Every cable run and connector in an ISRO RF system must be characterised for insertion loss. A coaxial cable with 3 dB loss at 2 GHz means half the transmitter power never reaches the antenna. Knowing this allows the system engineer to budget losses and set amplifier gain accordingly.

**What RangeReady does:**
- Swept insertion loss: dB vs frequency across the full band
- Single-frequency insertion loss: precision single-point measurement at the exact operating frequency
- Temperature coefficient of loss: if measurements are taken at different temperatures, RangeReady can show how loss changes with temperature
- Connector repeatability test: run the same cable 5 times, plot all sweeps, show the variation — tells the engineer whether the connector is making a reliable contact

**Output chart:** Insertion loss (dB, positive) vs frequency. Limit line = maximum allowable loss. Key metric: loss at centre frequency, worst-case frequency across the band.

---

#### Cable Loss vs Frequency

**What it measures:**
A specific version of insertion loss measurement designed for cable characterisation. Cable loss increases with frequency — a good cable has predictable, well-controlled loss vs frequency behaviour.

**RangeReady specific feature:**
Automatic cable loss model fitting: after measuring a cable, RangeReady fits the data to a standard cable loss model (loss ∝ √frequency) and extrapolates predicted loss at frequencies not measured. This is useful when the instrument's frequency range doesn't fully cover the operating frequency.

**Output:** Loss vs frequency chart with fitted model line overlaid. Cable length estimation from the loss vs frequency slope.

---

### 2.5 Noise Figure Measurements

---

#### Noise Figure (NF)

**What it measures:**
Noise Figure describes how much a component (amplifier, receiver, mixer) degrades the signal-to-noise ratio. A noiseless amplifier has NF = 0 dB — it amplifies the signal without adding any noise. Real amplifiers have NF > 0 dB. Lower NF = better, quieter device.

For satellite ground station receivers, NF is critically important — the weaker the signal from the spacecraft, the more important it is that the first amplifier in the chain (the LNA) has the lowest possible NF.

**NF in dB is defined as:**
```
NF = SNR_in (dB) − SNR_out (dB)
```

**How it is measured (Y-Factor method):**
The standard Y-Factor measurement uses a calibrated noise source:
1. Connect noise source to DUT input, DUT output to spectrum analyser
2. Turn noise source ON (hot state) → measure output power P_hot
3. Turn noise source OFF (cold state) → measure output power P_cold
4. Y = P_hot / P_cold
5. NF = ENR − 10×log10(Y − 1) where ENR is the noise source's Excess Noise Ratio

**Note on hardware requirement:**
A calibrated noise source (e.g., Siglent SNS series, Keysight 346B) is required for this measurement. RangeReady must store the ENR calibration data for the connected noise source and use it automatically in the NF calculation.

**Configuration:**
- Frequency range
- Number of frequency points
- Noise source ENR data: enter the ENR vs frequency table from the noise source calibration certificate
- Number of averages: 10–100 averages for stable readings
- NF limit: maximum allowable NF in dB

**What RangeReady shows:**
- Noise Figure (dB) vs frequency chart
- Noise Temperature (Kelvin) vs frequency chart (for satellite system engineers who prefer this unit)
- Associated gain: the DUT gain at each frequency point measured simultaneously
- Minimum Detectable Signal (MDS): derived from NF and bandwidth — shows the weakest signal the receiver can detect
- Cascaded NF calculator: if multiple stages are characterised, calculate the total system NF using Friis' formula
- Key metrics: average NF across band, worst NF frequency, minimum NF and where it occurs

---

#### Cascaded Noise Figure (Friis Calculator)

**What it is:**
A built-in calculator that takes NF and gain data for multiple components in a chain (e.g., LNA → cable → mixer → IF amplifier) and computes the total system noise figure using Friis' formula:

```
NF_total = NF_1 + (NF_2 − 1)/G_1 + (NF_3 − 1)/(G_1 × G_2) + ...
```

This is not a measurement — it is a calculation tool. The engineer enters the NF and gain of each stage (from measurements or datasheets), and RangeReady computes the total system NF.

**Why it matters:**
System designers use this to understand which component dominates the system noise. Friis' formula shows that the first stage dominates — so spending money on a 0.5 dB NF LNA is far more valuable than a 0.5 dB improvement in the third stage.

**Output:**
- Interactive table: add/remove stages, enter NF and gain per stage
- Total system NF shown in real time as stages are added
- Contribution chart: bar chart showing each stage's contribution to the total NF
- Sensitivity analysis: show how total NF changes if any one stage's NF improves by 1 dB

---

### 2.6 Linearity Measurements

---

#### 1 dB Compression Point (P1dB)

**What it measures:**
The input power level at which an amplifier's gain drops by 1 dB from its linear (small-signal) gain. Below P1dB, the amplifier is linear — double the input power, double the output power. Above P1dB, the amplifier saturates and distortion is generated.

P1dB is the boundary between linear and nonlinear operation. It tells you the maximum useful signal power the amplifier can handle.

**How it is measured:**
Sweep input power from low to high while measuring output power. The gain at each input power = output power − input power. Find the input power where gain has dropped by exactly 1 dB from the small-signal value.

**Hardware requirement:** A signal generator with variable output power + spectrum analyser (or power meter).

**Configuration:**
- Test frequency (single frequency, not swept)
- Input power start and stop (dBm)
- Power step size (0.5 dB or 1 dB steps)
- Small-signal gain (measured at low power, auto-detected)

**Output:**
- Power transfer curve: output power (dBm) vs input power (dBm)
- Gain vs input power curve (shows the 1 dB compression clearly)
- P1dB point marked on both charts
- Input P1dB value and Output P1dB value both displayed

---

#### IIP3 — Input-Referred Third-Order Intercept Point

**What it measures:**
IIP3 is the theoretical input power at which the third-order intermodulation distortion (IMD3) products would equal the fundamental signal — a figure of merit for amplifier linearity. Higher IIP3 = more linear device.

IIP3 is never actually reached in practice (the device would be destroyed first), but it is an essential benchmark for comparing amplifier linearity. ISRO LNAs are specified for IIP3 to ensure they don't generate spurious signals when multiple strong signals are present simultaneously.

**How it is measured (Two-Tone Test):**
Two closely spaced tones (f1 and f2) are applied simultaneously to the DUT input. The third-order products appear at 2f1 − f2 and 2f2 − f1. Measure the power difference between the fundamental tones and the IM3 products.

```
IIP3 = P_in + (P_fundamental − P_IM3) / 2
```

**Hardware requirement:** Two signal generators + power combiner + spectrum analyser.

**Configuration:**
- f1 and f2 frequencies (typically 1 MHz apart)
- Input power level
- Tone spacing
- Number of averages

**Output:**
- Spectrum display showing two fundamental tones and two IM3 products
- IM3 product power relative to fundamental (dBc)
- Calculated IIP3 value (dBm)
- OIP3 (output-referred) = IIP3 + gain
- Intercept diagram: classic two-line plot showing fundamental and IM3 extrapolated lines meeting at the IIP3 point

---

### 2.7 Power Measurements

---

#### Absolute Power Measurement

**What it measures:**
The total signal power at a specific frequency or over a band, in dBm or Watts.

**Use cases in ISRO labs:**
- Verify transmitter output power meets specification
- Check power at each port of a power divider to verify equal splitting
- Measure leakage power in cable shields

**Configuration:**
- Measurement frequency or band
- Measurement bandwidth
- Number of averages for stable reading
- Display unit: dBm, dBW, mW, W

**Output:** Large single-value display with unit. History chart showing power vs time (useful for monitoring transmitter power stability).

---

#### Channel Power

**What it measures:**
Total integrated power within a specified frequency bandwidth. Sums all the power across the channel, not just at the centre frequency. Used for measuring modulated signals where power is spread across the bandwidth.

**Configuration:**
- Centre frequency
- Channel bandwidth (integration bandwidth)
- Reference bandwidth (for normalisation)

**Output:** Channel power in dBm and dBm/Hz (power spectral density).

---

#### Harmonic Distortion

**What it measures:**
When a signal passes through a nonlinear device, harmonics are generated at integer multiples of the fundamental frequency. The second harmonic appears at 2 × f, third at 3 × f, etc. Harmonic distortion is measured as the power of each harmonic relative to the fundamental, in dBc (dB below the carrier).

**Why it matters:**
ISRO transmitters must meet harmonic emission specifications. A 2 GHz transmitter generating a strong 4 GHz harmonic could interfere with other systems. Regulatory specifications typically require harmonics to be at least −40 dBc to −60 dBc below the fundamental.

**Configuration:**
- Fundamental frequency
- Number of harmonics to measure (2nd through 5th)
- Input signal power

**Output:**
- Spectrum view showing fundamental + all harmonics marked
- Table: harmonic number, frequency, power (dBm), level relative to fundamental (dBc)
- Pass/fail against the specified dBc limit for each harmonic

---

#### Spurious Emissions

**What it measures:**
Any unintended signals present at the output of a transmitter or component at frequencies not related to the fundamental or its harmonics. Spurious emissions can cause interference and are tightly controlled in ISRO RF systems.

**Configuration:**
- Full frequency span to search (wide sweep)
- Fundamental frequency and bandwidth to exclude
- Spurious limit: maximum allowable level in dBm or dBc

**Output:**
- Full spectrum sweep with fundamental masked
- All peaks above the threshold flagged and labelled with frequency and level
- Automatic spurious finder: finds and lists the N strongest spurious emissions
- Pass/fail table: each spurious emission vs the limit

---

### 2.8 Advanced Measurements

---

#### Impedance Measurement (from S11)

**What it measures:**
S11 data can be mathematically converted to impedance at each frequency point. This tells the engineer the actual complex impedance of the antenna or component (resistance + reactance) instead of just how much power is reflected.

**RangeReady computes:**
```
Γ = 10^(S11_dB / 20) × e^(jφ)   [complex reflection coefficient]
Z = Z0 × (1 + Γ) / (1 − Γ)      [complex impedance, Z0 = 50 Ω]
```

**Output:**
- Real impedance (Ω) vs frequency
- Imaginary impedance (Ω) vs frequency
- Impedance magnitude (Ω) vs frequency
- Smith Chart: the most natural way to view impedance — plots the complex impedance on a normalised circular chart where the centre = 50 Ω perfect match, outer circle = open circuit, left edge = short circuit

---

#### Bandwidth Measurement

**What it measures:**
Automatically finds the 3 dB, 10 dB, or user-defined bandwidth of a filter, antenna, or any resonant component from the swept response data.

**Types supported:**
- 3 dB bandwidth: the frequency range where the response is within 3 dB of its peak
- 10 dB bandwidth: for antennas — the range where S11 < −10 dB
- Null-to-null bandwidth
- User-defined threshold bandwidth

**Output:** Start frequency, stop frequency, centre frequency, and bandwidth value. All annotated directly on the chart.

---

#### Reflection Coefficient (Gamma)

**What it measures:**
The complex reflection coefficient Γ (gamma) — the ratio of reflected wave to incident wave at a port. Related to S11 by: |Γ| = 10^(S11_dB/20). Values range from 0 (perfect match) to 1 (total reflection).

**Output:** Magnitude and phase of Γ vs frequency. Also shown as a point on the Smith Chart.

---

#### Time Domain Reflectometry (TDR) — from S11 Inverse FFT

**What it measures:**
By applying an Inverse Fast Fourier Transform (IFFT) to the frequency-domain S11 data, RangeReady can show where along a cable or transmission line a fault or impedance discontinuity occurs — in distance (metres), not frequency.

Think of it like radar for cables: a reflection at 2 metres means there is a connector, fault, or impedance change at 2 metres from the test port.

**Why it matters:**
When a cable in an ISRO ground station fails, TDR pinpoints the exact location of the fault without physically inspecting the full cable run. Critical for maintenance.

**Configuration:**
- Cable velocity factor (typically 0.66–0.85 for common coax types — enter from cable datasheet)
- Windowing function: Kaiser, Hanning, or Rectangular (affects resolution vs sidelobe trade-off)
- Time or distance display

**Output:**
- Reflection vs distance (metres) chart
- Peaks indicate impedance discontinuities — annotated with distance and reflection magnitude
- Fault identification: if a clear isolated peak is found, RangeReady labels it "Discontinuity at X.X m"

---

### 2.9 Calibration Measurements

---

#### Reference Measurement / Normalisation

**What it is:**
Before measuring insertion loss or gain, a "thru" measurement is made with the DUT replaced by a direct connection (or a known reference standard). This measurement is stored as the reference. All subsequent measurements are displayed relative to this reference, cancelling out cable and connector losses.

**Process in RangeReady:**
1. System prompts: "Connect THRU (bypass DUT). Click Measure Reference."
2. Reference sweep is captured and stored.
3. System prompts: "Insert DUT. Click Run Test."
4. All subsequent results show loss/gain relative to the thru.

---

#### SOLT Calibration (Short-Open-Load-Thru)

**What it is:**
The full two-port calibration procedure that removes systematic errors from the measurement — cable losses, connector reflections, instrument port mismatch. After SOLT calibration, the measurement reference plane is at the DUT connectors, not at the instrument ports.

**Process in RangeReady:**
Step-by-step guided wizard:
1. Connect SHORT standard to Port 1 → Measure → ✓
2. Connect OPEN standard to Port 1 → Measure → ✓
3. Connect LOAD (50 Ω) to Port 1 → Measure → ✓
4. Connect THRU between Port 1 and Port 2 → Measure → ✓
5. Calibration complete. Validity timer starts (4-hour expiry).

**RangeReady stores:**
- Calibration timestamp, engineer name, instrument serial, cal standard type
- Cal validity status (valid/expired) shown as a persistent indicator on every measurement screen

---

## 3. Design System — Liquid Glass Light Theme

### 3.1 Colour Palette

```css
/* ─── Foundation ───────────────────────────────────────────── */
--bg-page:          #F8F7F4;   /* Warm off-white — the base canvas */
--bg-surface:       rgba(255, 255, 255, 0.72);  /* Frosted glass card surface */
--bg-surface-hover: rgba(255, 255, 255, 0.88);  /* Card on hover */
--bg-elevated:      rgba(255, 255, 255, 0.95);  /* Tooltips, dropdowns, modals */
--bg-input:         rgba(255, 255, 255, 0.60);  /* Input fields */
--bg-sidebar:       rgba(248, 247, 244, 0.85);  /* Sidebar — slightly warmer */

/* ─── Glass Effect Variables ─────────────────────────────── */
--glass-blur:       12px;      /* backdrop-filter blur for surfaces */
--glass-blur-heavy: 24px;      /* for modals and elevated panels */
--glass-border:     rgba(255, 255, 255, 0.85);  /* top/left border of glass */
--glass-border-dim: rgba(200, 196, 188, 0.40);  /* bottom/right border of glass */
--glass-shadow:     0 4px 24px rgba(0, 0, 0, 0.07), 0 1px 4px rgba(0, 0, 0, 0.05);
--glass-shadow-lg:  0 8px 40px rgba(0, 0, 0, 0.10), 0 2px 8px rgba(0, 0, 0, 0.06);

/* ─── Text ────────────────────────────────────────────────── */
--text-primary:     #1A1814;   /* Near-black with warm undertone */
--text-secondary:   #6B6860;   /* Muted warm grey */
--text-tertiary:    #A09D98;   /* Placeholders, disabled labels */
--text-inverse:     #FFFFFF;

/* ─── Accent — Signal Blue ────────────────────────────────── */
--accent-blue:      #1E6FD9;   /* Primary interactive, trace colour */
--accent-blue-soft: #EEF4FD;   /* Light background for blue accents */
--accent-blue-mid:  #4D94F0;   /* Hover state, secondary actions */

/* ─── Status ──────────────────────────────────────────────── */
--status-pass:      #16A34A;   /* Emerald green */
--status-pass-bg:   #F0FDF4;   /* Pass badge background */
--status-pass-border: #BBF7D0;

--status-fail:      #DC2626;   /* Coral red */
--status-fail-bg:   #FEF2F2;   /* Fail badge background */
--status-fail-border: #FECACA;

--status-warn:      #D97706;   /* Warm amber */
--status-warn-bg:   #FFFBEB;
--status-warn-border: #FDE68A;

--status-info:      #0891B2;   /* Teal — informational */
--status-info-bg:   #ECFEFF;
--status-info-border: #A5F3FC;

--status-active:    #7C3AED;   /* Purple — measurement in progress */
--status-active-bg: #F5F3FF;

/* ─── Borders ─────────────────────────────────────────────── */
--border-subtle:    rgba(0, 0, 0, 0.06);
--border-default:   rgba(0, 0, 0, 0.10);
--border-strong:    rgba(0, 0, 0, 0.18);

/* ─── Chart Background ────────────────────────────────────── */
--chart-bg:         #FAFAF8;   /* Warm near-white for chart area */
--chart-grid:       rgba(0, 0, 0, 0.06);
--chart-axis:       rgba(0, 0, 0, 0.25);
--chart-trace-1:    #1E6FD9;   /* Primary trace — signal blue */
--chart-trace-2:    #16A34A;   /* Second trace — green */
--chart-trace-3:    #D97706;   /* Third trace — amber */
--chart-trace-4:    #7C3AED;   /* Fourth trace — purple */
--chart-limit-upper: #DC2626;  /* Upper limit line — red */
--chart-limit-lower: #16A34A;  /* Lower limit line — green */
--chart-fail-zone:  rgba(220, 38, 38, 0.06);   /* Shaded region for fail areas */
```

### 3.2 Typography

```css
/* ─── Font Stack ─────────────────────────────────────────── */
--font-ui:    'DM Sans', 'Helvetica Neue', sans-serif;      /* All UI text */
--font-mono:  'DM Mono', 'JetBrains Mono', monospace;       /* Values, frequencies, data */
--font-label: 'DM Sans', sans-serif;                         /* Labels, nav items */

/* ─── Type Scale ──────────────────────────────────────────── */
--text-xs:    11px;   /* Units, secondary labels, timestamps */
--text-sm:    12px;   /* Table cells, secondary nav */
--text-base:  13px;   /* Body text, descriptions */
--text-md:    14px;   /* Primary labels, button text */
--text-lg:    16px;   /* Section headers, card titles */
--text-xl:    20px;   /* Screen titles */
--text-2xl:   28px;   /* Big metric values (e.g. −18.3 dB) */
--text-3xl:   40px;   /* Hero metric on result screens */

/* ─── Font Weights ────────────────────────────────────────── */
--weight-regular: 400;
--weight-medium:  500;
--weight-semibold: 600;

/* ─── Line Heights ────────────────────────────────────────── */
--leading-tight:  1.2;
--leading-normal: 1.5;
--leading-relaxed: 1.7;
```

**Typography Rules — Non-Negotiable:**
- All measurement values (dBm, MHz, VSWR, ns) use `font-mono` with `tabular-nums` and `font-feature-settings: "tnum"`. This prevents layout shifting as live values update.
- Screen titles and section headers: `font-label`, weight 500, letter-spacing 0.03em
- Navigation items: `font-mono`, weight 400, all caps, letter-spacing 0.1em, font-size 11px
- Pass/Fail badges: `font-mono`, weight 600, letter-spacing 0.05em

### 3.3 Glass Card System

Every surface in RangeReady is a glass card. There are three levels:

**Level 1 — Base Surface** (most content lives here)
```css
.glass-card {
  background: var(--bg-surface);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-bottom-color: var(--glass-border-dim);
  border-right-color: var(--glass-border-dim);
  box-shadow: var(--glass-shadow);
  border-radius: 16px;
}
```

**Level 2 — Elevated Surface** (tooltips, dropdowns, modals)
```css
.glass-elevated {
  background: var(--bg-elevated);
  backdrop-filter: blur(var(--glass-blur-heavy));
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: var(--glass-shadow-lg);
  border-radius: 12px;
}
```

**Level 3 — Inset Surface** (input fields, table rows, code blocks)
```css
.glass-inset {
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
}
```

**Critical implementation note:** Liquid glass requires the page background to have visual texture or gradient for the blur to be visible. The page background must never be a flat solid colour. Use:
```css
body {
  background: 
    radial-gradient(ellipse at 20% 20%, rgba(30, 111, 217, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 80%, rgba(22, 163, 74, 0.04) 0%, transparent 60%),
    #F8F7F4;
}
```

### 3.4 Spacing System (8px grid)

```
4px   — Icon-to-label gap, badge padding
8px   — Tight internal spacing
12px  — Default internal padding
16px  — Card padding (small)
20px  — Standard gap between elements
24px  — Card padding (standard)
32px  — Section spacing
40px  — Large section gap
48px  — Page-level margins
```

### 3.5 Border Radius System

```
4px   — Small badges, tags, inline chips
8px   — Input fields, table rows, small cards
12px  — Buttons, dropdown menus
16px  — Standard glass cards
24px  — Large panels, modals
9999px — Pill badges (PASS / FAIL / LIVE)
```

### 3.6 Shadows & Depth

The shadow system communicates depth without borders:

```css
/* No depth — flat element */
.shadow-none: none

/* Floating above page */
.shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)

/* Standard glass card */
.shadow-md: 0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.05)

/* Elevated panel, focused input */
.shadow-lg: 0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)

/* Modal, command palette */
.shadow-xl: 0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)
```

---

## 4. Application Layout & Navigation

### 4.1 Overall Shell

```
┌────────────────────────────────────────────────────────────────────┐
│  TOPBAR  [52px height — glass, blurred, sticky]                     │
│  ◈ RangeReady     [Breadcrumb: Dashboard / Test Runner]     [👤 AJ] │
├──────────────┬─────────────────────────────────────────────────────┤
│              │                                                       │
│   SIDEBAR    │   MAIN CONTENT AREA                                  │
│   [240px]    │   background: var(--bg-page)                         │
│   glass bg   │   padding: 32px                                      │
│              │   max-width: 1280px, centered                        │
│   Nav items  │                                                       │
│   (see 4.2)  │                                                       │
│              │                                                       │
│              │                                                       │
│   [bottom]   │                                                       │
│   Version    │                                                       │
│   Cal Status │                                                       │
└──────────────┴─────────────────────────────────────────────────────┘
```

### 4.2 Sidebar Navigation

The sidebar is a glass panel — `background: var(--bg-sidebar)`, `backdrop-filter: blur(16px)`, subtle right border.

**Navigation structure:**
```
◈ RANGEREADY
─────────────────────
INSTRUMENTS
  ○  Instrument Manager

TESTING
  ○  Run Test
  ○  Calibration
  ○  Templates

DATA
  ○  History
  ○  Reports

─────────────────────
SYSTEM
  ○  Settings
  ○  Engineers
─────────────────────

[Bottom section]
● CAL STATUS
  Valid until 14:23
  Siglent SSA3032X

v2.0.0
```

**Nav item design:**
- Inactive: `color: var(--text-secondary)`, `font-mono`, 11px, uppercase, letter-spacing 0.1em
- Active: left accent bar (3px, `var(--accent-blue)`), background `rgba(30, 111, 217, 0.06)`, text `var(--accent-blue)`
- Hover: background `rgba(0, 0, 0, 0.04)`, 150ms ease transition
- Section labels: `var(--text-tertiary)`, 10px, uppercase, non-clickable dividers

### 4.3 Topbar

Glass topbar with blur. Contains:
- Left: RangeReady logo mark + current page breadcrumb
- Centre: Instrument status pill — green dot + model name if connected, red dot if disconnected
- Right: Engineer avatar/initials circle + name

### 4.4 Responsive Behaviour

- Sidebar collapses to icon-only at widths < 1024px
- Main content area has minimum width of 720px
- Charts have minimum width of 480px and scale to fill available width
- Touch targets minimum 44px × 44px (for lab touchscreen monitors)

---

## 5. Screen-by-Screen Specification

---

### Screen 1 — Instrument Manager

**Purpose:** Connect, verify, and manage lab instruments.

**Layout:**
```
[Page Title: INSTRUMENT MANAGER]
[Subtitle: Connect and verify test instruments]

[Scan for Instruments button — primary]
[Manual add by VISA address — secondary]

─────────────────────────────────────────────
CONNECTED INSTRUMENTS
─────────────────────────────────────────────

[Instrument Card 1]
  ● Connected
  Siglent SSA3032X Plus
  Serial: SSA3XCAQ6R0012  |  FW: 2.1.1.5
  USB0::0xF4ED::0xEE3A::SSA3XCAQ6R0012::INSTR
  [Send *IDN?]  [Disconnect]  [Set as Active]

─────────────────────────────────────────────
AVAILABLE (NOT CONNECTED)
─────────────────────────────────────────────
  [Instrument Card 2 — dimmed]
```

**Instrument Card — Glass card spec:**
- 72px height
- Left: status dot (animated pulse if connected, static grey if not)
- Model name: `font-ui`, 14px, weight 500, `var(--text-primary)`
- Serial + firmware: `font-mono`, 11px, `var(--text-secondary)`
- VISA address: `font-mono`, 10px, `var(--text-tertiary)`, truncated with ellipsis
- Right: action buttons as ghost buttons

**Scan animation:** When scanning, the scan button shows a rotating ring animation. Discovered instruments appear one by one with a 150ms staggered fade-in.

**Status dot behaviour:**
- Connected: `var(--status-pass)`, animated `pulse` keyframe at 2s interval
- Busy: `var(--status-active)` purple, faster pulse
- Error: `var(--status-fail)`, no animation, static
- Disconnected: `var(--text-tertiary)`, static

---

### Screen 2 — Calibration Wizard

**Purpose:** Guide the engineer through instrument calibration step by step.

**Layout — Full-screen wizard mode:**
```
Progress: ─●──○──○──○──  Step 1 of 4: SHORT Standard

┌─────────────────────────────────────────────────────────────┐
│  [Large diagram area — SVG showing what to connect]          │
│  Connect the SHORT standard to Port 1 of the instrument.     │
│  Make sure the connection is finger-tight.                   │
│                                                              │
│  [Illustration: coaxial connector with SHORT cap on it]      │
│                                                              │
│  ──────────────────────────────────────────────────────────  │
│  Expected S11: ~0 dB (total reflection)                      │
│  Measured S11: [live value updating]                         │
│  Status: ✓ Within expected range                             │
└─────────────────────────────────────────────────────────────┘

[Back]                                     [Measure & Continue →]
```

**Design rules:**
- Full-width wizard layout — no sidebar, no topbar clutter
- One thing on screen at a time
- Step progress bar at top: dots with connecting line, active step in `var(--accent-blue)`
- Large clear instruction text — minimum 16px, `var(--text-primary)`
- Real-time validation: once the measurement is within the expected range, the "Measure & Continue" button turns from grey to blue
- Engineer name must be entered at the start of every calibration session
- Completion screen: green checkmark animation, calibration certificate details, "Begin Testing" CTA

---

### Screen 3 — Template Builder

**Purpose:** Create and manage reusable test sequences.

**Layout — Split panel:**
```
Left panel (320px): Template Library
  [Search templates]
  ─────────────────
  TTC Antenna L-band         →
  UHF Antenna S11 + VSWR     →
  S-band Filter Full          →
  LNA Gain + NF               →
  [+ New Template]

Right panel: Template Editor
  Template Name: [TTC Antenna L-band       ]
  Description:   [                          ]

  MEASUREMENT STEPS
  ─────────────────────────────────────────────────
  ⠿  1  S11         100 MHz – 3.2 GHz    UL: −10 dB
  ⠿  2  VSWR        100 MHz – 3.2 GHz    Limit: 2.0
  ⠿  3  S21         100 MHz – 3.2 GHz    Passband ±1 dB
  ⠿  4  Group Delay 100 MHz – 3.2 GHz    Var: < 5 ns
  [+ Add Step]

  [Cancel]                                    [Save Template]
```

**Step row design:**
- Drag handle (⠿) on left for reordering
- Measurement type badge: coloured pill (blue for S-params, green for gain, amber for noise)
- Frequency range: `font-mono`, `var(--text-secondary)`
- Limit summary: `font-mono`, `var(--text-secondary)`
- Click to expand: inline editor shows all step parameters

**Step configuration modal (glass elevated card):**
- Measurement type dropdown
- Frequency start/stop with unit selector (MHz/GHz)
- RBW, sweep points, reference level
- Spec limits: upper (dB), lower (dB)
- Custom step name

---

### Screen 4 — Test Runner (Active Test)

**Purpose:** Execute a test sequence with live feedback.

This is the most important screen. Maximum data density. Zero wasted space.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ▶ RUNNING  ──●●●○○──  Step 3 of 5: S21 Insertion Loss          │
│  DUT: TTC-ANT-2024-0087  ·  Engineer: A. Joshi  ·  ETA: 1m 40s  │
│                                                  [■ ABORT]       │
├──────────────────────────────────┬──────────────────────────────┤
│                                   │                               │
│   LIVE TRACE                      │   STEP RESULTS               │
│   ┌───────────────────────────┐   │  ─────────────────────────   │
│   │  [FrequencyPlot — live]   │   │  ✓  S11          PASS        │
│   │  Trace: signal blue       │   │     −18.3 dB @ 2.45 GHz     │
│   │  UL: red dashed           │   │                              │
│   │  LL: green dashed         │   │  ✓  VSWR         PASS        │
│   └───────────────────────────┘   │     1.32 @ 2.45 GHz         │
│                                   │                              │
│   KEY METRICS (live)              │  ▶  S21           RUNNING    │
│   ┌──────┬──────┬──────┬──────┐   │     ████░░░░ 48%            │
│   │−1.2dB│2.47G │±0.4dB│  ✓   │   │                              │
│   │ Min  │ Ctr  │Ripl  │P/F   │   │  ○  Group Delay  PENDING    │
│   └──────┴──────┴──────┴──────┘   │                              │
│                                   │  ○  Noise Figure  PENDING    │
└───────────────────────────────────┴──────────────────────────────┘
```

**Design rules:**
- Live trace chart: `--chart-bg` background, updates every 100ms without flickering
- Key metrics row: four glass metric cards in a row — monospace values, large (28px), tabular-nums
- Step results panel: each completed step shows a result summary — measurement type, result value, pass/fail icon
- Running step: shows a progress bar with percentage
- ABORT button: `var(--status-fail)` red, right-aligned in header, requires confirmation click
- Overall header: gradient from `var(--status-active-bg)` showing active state

---

### Screen 5 — Results Dashboard

**Purpose:** Full results view after a test sequence completes.

**Layout — Vertical scrollable:**
```
┌─────────────────────────────────────────────────────────────────┐
│  OVERALL: ● PASS  ·  TTC-ANT-2024-0087  ·  22 Mar 2026 14:32   │
│  5/5 steps passed  ·  Siglent SSA3032X  ·  Cal: Valid           │
│  [Download PDF Report]        [Export Excel]       [New Test]   │
└─────────────────────────────────────────────────────────────────┘

RESULTS SUMMARY TABLE
─────────────────────────────────────────────────────────────────
Step    Measurement    Result Value    Limit       Status
─────────────────────────────────────────────────────────────────
1       S11            −18.3 dB min   < −10 dB    ✓ PASS
2       VSWR           1.32           < 2.0        ✓ PASS
3       S21            −0.8 dB        < −1 dB      ✓ PASS
4       Group Delay    ±1.8 ns        < ±5 ns      ✓ PASS
5       Noise Figure   1.2 dB         < 2.5 dB     ✓ PASS
─────────────────────────────────────────────────────────────────

DETAILED CHARTS (one section per step, scroll down)
─────────────────────────────────────────────────
[S11 Chart — full width, 320px tall]
[Key metrics row for S11]

[VSWR Chart]
[Key metrics row for VSWR]

... (repeated for each step)
```

**If FAIL:**
- Header background: `var(--status-fail-bg)`
- Overall badge: `FAIL` in `var(--status-fail)`
- Failed steps highlighted in red in the summary table
- Failing frequency regions shaded on the chart
- Failed metric values shown in red

---

### Screen 6 — History

**Purpose:** Browse all past test sessions with filtering.

**Layout:**
```
[HISTORY]

[Search by DUT name or serial...]    [Filter ▼]    [Date range]

─────────────────────────────────────────────────────────────────
DATE          DUT NAME           TEMPLATE          RESULT  ENG
─────────────────────────────────────────────────────────────────
22 Mar 2026   TTC-ANT-2024-0087  Full ISRO Suite   ✓ PASS  AJ
22 Mar 2026   LNA-S-BAND-012     LNA Gain + NF     ✗ FAIL  AJ
21 Mar 2026   UHF-ANT-055        UHF Quick Check   ✓ PASS  RK
...
─────────────────────────────────────────────────────────────────
```

**Row design:** Glass card row with hover state. Pass rows have a very subtle left border in `var(--status-pass)`. Fail rows in `var(--status-fail)`. Click anywhere on the row to open the full result detail.

---

### Screen 7 — Report Builder

**Purpose:** Preview and customise the ISRO-format report before downloading.

**Layout — Preview + Controls split:**
```
Left (400px): Report Settings
  Client Name: [                    ]
  Project Ref: [                    ]
  Engineer Sign-off: [              ]
  Company Logo: [Upload PNG]
  Include sections:
    ☑ Cover page
    ☑ Summary table
    ☑ All charts
    ☑ Raw data tables
    ☑ Calibration record
    ☑ Sign-off page
  [Generate PDF]    [Export Excel]

Right: Live Report Preview
  [Scrollable PDF preview — rendered in-app]
```

---

### Screen 8 — Settings

**Purpose:** Configure instrument defaults, calibration intervals, engineer profiles, report branding.

Organised into clearly labelled sections on a single scrollable page:
- Instrument Defaults (default RBW, default sweep points, VISA backend)
- Calibration (calibration expiry interval in hours, auto-block toggle)
- Report Branding (company name, logo, footer text)
- Engineers (add/remove engineer profiles with name, role, signature)
- Advanced (port number, log level, database location, reset to defaults)

---

## 6. Chart & Visualization System

### 6.1 Chart Design Rules — Non-Negotiable

1. **Chart background:** Always `var(--chart-bg)` — warm near-white. Never dark background in light theme.
2. **Grid lines:** `var(--chart-grid)` — very subtle. Present but not dominant.
3. **Axis labels:** `font-mono`, 10px, `var(--text-secondary)`, tabular-nums.
4. **Axis titles:** `font-label`, 11px, `var(--text-tertiary)`, positioned along axis.
5. **Trace line width:** 1.5px for primary trace, 1px for secondary/reference traces.
6. **Limit lines:** dashed (4px dash, 4px gap), 1.5px width, red for upper limit, green for lower.
7. **Chart border radius:** 12px (matches glass card corners).
8. **Chart padding:** 48px top, 40px right, 36px bottom, 52px left (space for axis labels).
9. **No animation on live-updating traces.** Set `isAnimationActive={false}` in Recharts. Animation causes flickering.
10. **Tooltip:** Glass elevated style. `font-mono` values. Shows frequency + amplitude on hover.

### 6.2 Chart Types

**Frequency Plot (Primary — used for all swept measurements)**
- Library: Recharts `LineChart`
- X-axis: frequency in MHz or GHz (auto-unit selection based on range)
- Y-axis: amplitude in dB or dBm
- Primary trace: `var(--chart-trace-1)` blue
- Comparison trace (previous measurement): `var(--chart-trace-2)` green at 60% opacity
- Upper limit line: `var(--chart-limit-upper)` red dashed
- Lower limit line: `var(--chart-limit-lower)` green dashed
- Fail zones: shaded red at 6% opacity where trace exceeds limit

**Smith Chart (for S11/S22 impedance)**
- Custom SVG component — no third-party library does this adequately
- Outer circle = normalised |Γ| = 1 (open circuit boundary)
- Constant resistance circles: thin lines, `var(--chart-grid)`
- Constant reactance arcs: thin lines, `var(--chart-grid)`
- Data trace: series of dots connected by thin line, coloured by frequency (blue at low frequency → amber at high frequency — this colour gradient encodes frequency on the Smith Chart)
- Centre mark (50 Ω): cross-hair in `var(--accent-blue)`
- Key points: markers at start, centre, and end frequency
- Interactive: hover over any point to show frequency, impedance, and VSWR

**Power vs Input Chart (for P1dB)**
- Two overlaid line charts: output power (blue) and gain (amber) vs input power
- The 1 dB compression point is marked with a vertical dashed line and labelled

**IIP3 Intercept Diagram**
- Two extrapolated lines: fundamental (slope 1) and IM3 (slope 3) on log-log axes
- Intersection point labelled "IIP3 = X dBm"
- Measured data points shown as dots on both lines

**VSWR Chart**
- Same as frequency plot but Y-axis is VSWR (ratio, not dB)
- Limit line is horizontal (e.g., VSWR = 2.0)
- Y-axis starts at 1.0 (never below 1.0 — VSWR cannot be less than 1)

**Group Delay Chart**
- Y-axis: delay in nanoseconds
- Same chart format as frequency plot
- Zero-delay reference line always shown
- Limit shown as ±X ns band shaded around the mean

### 6.3 Live Chart Updates

During an active test, the chart updates as new data arrives from the WebSocket:

- Update frequency: every complete sweep (typically every 1–5 seconds depending on span and RBW)
- Data is never appended to the existing trace — the full trace is replaced each sweep
- Previous sweep shown as a faint secondary trace for comparison
- Chart axes must not rescale during live updates — axes are fixed to the configured range

---

## 7. Component Library

### 7.1 Glass Card

```
[Glass Card]
─────────────────────────────────
background: var(--bg-surface)
backdrop-filter: blur(12px)
border: 1px solid var(--glass-border)
box-shadow: var(--glass-shadow)
border-radius: 16px
padding: 24px
─────────────────────────────────
CARD TITLE                    [Action button]
Card subtitle or description text
─────────────────────────────────
[Content area]
```

### 7.2 Status Badge

```
┌──────────────┐
│  ● PASS      │   background: var(--status-pass-bg)
│  ● FAIL      │   color: var(--status-pass/fail)
│  ● RUNNING   │   border: 1px solid var(--status-pass/fail-border)
└──────────────┘   border-radius: 9999px, padding: 4px 12px
                   font-mono, 11px, weight 600, letter-spacing 0.08em
```

### 7.3 Metric Card

Used in the key metrics row during and after tests:
```
┌────────────────┐
│  −18.3 dB      │   Value: font-mono, 28px, weight 500, color: text-primary
│  Min S11       │   Label: font-label, 11px, text-secondary, uppercase
│  @ 2.45 GHz    │   Sub-label: font-mono, 10px, text-tertiary
└────────────────┘   Glass card, 12px radius, 16px padding
```

### 7.4 Progress Step Indicator

Used in calibration wizard and test runner:
```
●──●──●──○──○
1   2   3   4   5
Done Done Curr Pend Pend
```
- Completed: filled circle, `var(--status-pass)` green
- Current: filled circle, `var(--accent-blue)` with outer ring
- Pending: empty circle, `var(--border-default)`
- Connecting line: `var(--border-default)`, 1px

### 7.5 Input Fields

```css
.input-field {
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 10px 14px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.input-field:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(30, 111, 217, 0.12);
  outline: none;
}
```

### 7.6 Buttons

**Primary (Run Test, Generate Report, Connect):**
```css
background: var(--accent-blue);
color: white;
border-radius: 10px;
padding: 10px 20px;
font: var(--font-label), 13px, weight 500;
box-shadow: 0 2px 8px rgba(30, 111, 217, 0.30);
transition: all 150ms ease;
hover: background: var(--accent-blue-mid), transform: translateY(-1px)
active: transform: scale(0.98)
```

**Secondary (Export, Cancel, Back):**
```css
background: var(--bg-surface);
border: 1px solid var(--border-default);
color: var(--text-primary);
/* same sizing and radius as primary */
hover: background: var(--bg-surface-hover), border-color: var(--border-strong)
```

**Danger (Abort, Delete):**
```css
background: var(--status-fail-bg);
border: 1px solid var(--status-fail-border);
color: var(--status-fail);
```

### 7.7 Data Table

```
Header row: background rgba(0,0,0,0.04), font-label 11px uppercase letter-spacing 0.08em
Data rows: alternate rgba(0,0,0,0) and rgba(0,0,0,0.02)
Hover: rgba(30, 111, 217, 0.04) with 150ms transition
Cell padding: 12px 16px
Border: 1px solid var(--border-subtle) on bottom of each row
Pass cells: value in var(--status-pass), small ✓ icon
Fail cells: value in var(--status-fail), small ✗ icon, background var(--status-fail-bg) at 50% opacity
```

---

## 8. Interaction & Animation Rules

### 8.1 Transition Defaults
```
All UI transitions: 150ms ease
Chart updates: immediate (no transition — data accuracy priority)
Modal open/close: 200ms ease-out (scale 0.96 → 1.0, opacity 0 → 1)
Sidebar item active: 100ms ease
Page navigation: 180ms fade (opacity only — no slide, no scale)
```

### 8.2 Hover States
- All clickable elements: cursor pointer
- Glass cards (when clickable): `box-shadow` increases to `var(--glass-shadow-lg)`, border brightens slightly
- Buttons: `translateY(-1px)` lift
- Table rows: subtle blue tint background
- Nav items: background tint

### 8.3 Loading States
- Initial app load: skeleton cards (grey shimmer animation) while data loads
- Instrument scan: rotating ring on scan button, pulsing placeholder instrument cards
- Test step running: progress bar with animated fill, step card shows spinner
- Report generating: button shows spinner + "Generating..." text

### 8.4 Micro-interactions
- Calibration step complete: green checkmark draws itself in 300ms (SVG stroke animation)
- Overall test PASS: brief green pulse radiates from PASS badge
- Overall test FAIL: brief red shake animation on FAIL badge (subtle, 200ms)
- New measurement connected: instrument card slides in from right with fade, 250ms
- Value updates in live chart: no animation — pure data update

### 8.5 What Must Never Animate
- Live chart trace data
- Measurement values in metric cards (tabular-nums handles the visual stability)
- Table rows in history (they load instantly from DB)

---

## 9. Report System Specification

### 9.1 PDF Report — ISRO Format

The PDF report must match the format expected by ISRO qualification reviewers. It is generated by ReportLab in Python.

**Page 1 — Cover Page:**
- Company logo (top-right)
- "RF COMPONENT TEST REPORT" — 24pt title
- DUT Name, DUT Serial Number
- Test Date and Time
- Instrument: Model, Serial, NABL Calibration Reference
- Test Engineer Name
- Template Used
- Overall Result: PASS or FAIL (large, coloured)
- Company name, address, GVB Tech letterhead footer

**Page 2 — Test Configuration:**
Table showing: each step name, measurement type, frequency range, RBW, sweep points, spec limits

**Page 3 — Calibration Record:**
Cal type, date/time, instrument, engineer, expiry, pass/fail, NABL reference

**Page 4 — Results Summary:**
Table: step number, measurement, result value, spec limit, PASS/FAIL status

**Pages 5–N — Detailed Results (one page per step):**
For each measurement step:
- Step name and measurement type as section header
- Full-width frequency chart (700 × 350 pt) with trace, limit lines, markers
- Key metrics table below the chart: all auto-extracted values
- Pass/Fail result for this step

**Final Page — Sign-off:**
Engineer name, date, signature line, company stamp placeholder, document control number

### 9.2 Excel Export

One workbook, one sheet per measurement step:
- Row 1: headers (Frequency Hz, Frequency MHz, Amplitude dBm, VSWR, Pass/Fail per point)
- Rows 2–N: data
- Embedded chart (Recharts-equivalent via openpyxl) for each sheet
- Summary sheet: overall results table

### 9.3 Report Versioning

If a DUT is tested multiple times:
- First report: v1
- Re-test: v2, with note "Re-test following rework"
- All versions stored and accessible from History screen

---

## 10. Accessibility & Performance

### 10.1 Accessibility Requirements

- All interactive elements must have ARIA labels
- Keyboard navigation must work for all primary flows (Tab, Enter, Escape, Arrow keys)
- Focus rings: visible, using `box-shadow: 0 0 0 3px rgba(30, 111, 217, 0.25)`
- Colour is never the only differentiator — all pass/fail states use both colour and icon (✓ / ✗)
- Minimum contrast ratio: 4.5:1 for all body text against background

### 10.2 Performance Requirements

| Metric | Target |
|--------|--------|
| App startup to usable | < 4 seconds |
| Instrument scan response | < 3 seconds |
| Chart render (601 points) | < 100ms |
| Live chart update (per sweep) | < 50ms render time |
| PDF generation (full report) | < 10 seconds |
| Test history load (100 sessions) | < 500ms |
| FastAPI response time (most endpoints) | < 200ms |

### 10.3 Error States

Every screen must handle these error states gracefully:
- **Instrument disconnected mid-test:** Immediate notification, test paused, option to reconnect and resume
- **Calibration expired:** Block test start, show expiry time, direct to Calibration screen
- **SCPI timeout:** Show "Instrument not responding" with retry option, log error
- **Database write failure:** Show warning, retry, never silently lose data
- **Report generation failure:** Show error detail, option to retry, raw data always accessible

---

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                    │
│   ◈ RANGEREADY  ·  Software Description & UI/UX Spec  ·  v2.0   │
│   GVB Tech Solutions  ·  Sriharikota / Bengaluru, India          │
│   CONFIDENTIAL — For Software & Product Development Teams Only    │
│                                                                    │
│   "Every measurement. Every time. With precision."                │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```
