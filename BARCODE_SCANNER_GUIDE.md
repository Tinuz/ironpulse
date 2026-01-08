# Barcode Scanner - Gebruiksinstructies

## Overzicht
De NXT•REP app heeft een ingebouwde barcode scanner waarmee je eenvoudig voedingswaarden van producten kunt ophalen door de barcode te scannen.

## Hoe te gebruiken

### 1. Open de Nutrition Tracker
- Ga naar de Nutrition pagina in de app
- Klik op de **"SCAN"** knop rechtsboven bij "Today's Meals"

### 2. Geef camera-toegang
- De browser zal vragen om camera-toegang
- Klik op **"Toestaan"** om de camera te gebruiken
- **Let op**: Camera-toegang werkt alleen via HTTPS (of localhost in development)

### 3. Scan de barcode
- Houd de barcode van het product voor de camera
- De scanner herkent automatisch EAN-13, UPC-A en UPC-E formaten
- Wacht tot de barcode wordt herkend (dit gebeurt automatisch)

### 4. Bekijk productinformatie
Na succesvolle scan zie je:
- **Productnaam** en merk (indien beschikbaar)
- **Productafbeelding** (indien beschikbaar)
- **Voedingswaarden per 100g**:
  - Calorieën (kcal)
  - Eiwitten (g)
  - Koolhydraten (g)
  - Vetten (g)

### 5. Pas portiegrootte aan
- Voer de **grammen** in die je hebt gegeten
- Standaard staat dit op 100g
- De app berekent automatisch de juiste voedingswaarden voor jouw portie
- Voorbeeld: Als je 150g hebt gegeten, voer dan "150" in

### 6. Voeg toe aan daglog
- Klik op **"Gebruiken"** om het product toe te voegen
- Het formulier wordt automatisch ingevuld met de productgegevens
- Je kunt de gegevens nog aanpassen indien nodig
- Klik op **"Add to Log"** om definitief toe te voegen

## API: Open Food Facts

De app gebruikt de **Open Food Facts** database om productinformatie op te halen:
- **Gratis** en open source database
- **Geen API key** nodig
- Bevat **miljoenen** producten wereldwijd
- Data wordt bijgedragen door gebruikers

**Let op**: Niet alle producten zijn beschikbaar in de database. Als een product niet gevonden wordt, kun je:
- Het product handmatig toevoegen via de "ADD" knop
- Opnieuw scannen om te controleren
- Bijdragen aan Open Food Facts door het product daar toe te voegen

## Troubleshooting

### Camera werkt niet
**Probleem**: "Kon camera niet starten" foutmelding

**Oplossingen**:
1. Controleer of je camera-toegang hebt gegeven in de browser
2. Controleer of je via HTTPS verbonden bent (of localhost)
3. Controleer of een andere app de camera niet al gebruikt
4. Herlaad de pagina en probeer opnieuw
5. Op mobiel: controleer je privacy-instellingen

### Product niet gevonden
**Probleem**: "Product niet gevonden in database"

**Oplossingen**:
1. Controleer of de barcode goed gescand is
2. Probeer de barcode opnieuw te scannen
3. Voeg het product handmatig toe via "ADD"
4. Draag bij aan Open Food Facts door het product daar toe te voegen

### Barcode wordt niet herkend
**Probleem**: Scanner blijft zoeken maar vindt niets

**Oplossingen**:
1. Zorg voor **goede verlichting**
2. Houd de camera **stil** en de barcode **recht** voor de lens
3. Houd de juiste **afstand** (circa 10-20cm)
4. Zorg dat de barcode **scherp** en **leesbaar** is
5. Probeer een andere hoek

### Internetverbinding
De scanner heeft een **actieve internetverbinding** nodig om productgegevens op te halen van Open Food Facts API.

## Ondersteunde Barcodes

De scanner ondersteunt de volgende barcode-formaten:
- **EAN-13** (meest voorkomend in Europa)
- **UPC-A** (veelgebruikt in Noord-Amerika)
- **UPC-E** (compact formaat)

## Privacy & Beveiliging

- De camera wordt **alleen lokaal** gebruikt in je browser
- Er worden **geen foto's opgeslagen** of geüpload
- Alleen de barcode-waarde wordt naar Open Food Facts API gestuurd
- Camera-toegang wordt **automatisch gestopt** na het scannen
- Je kunt camera-toegang op elk moment intrekken in je browserinstellingen

## Tips voor beste resultaten

✅ **Do's**:
- Gebruik de scanner in een **goed verlichte** ruimte
- Houd je telefoon **stabiel**
- Scan de barcode **recht vooruit**
- Gebruik de **achtercamera** voor beste kwaliteit

❌ **Don'ts**:
- Scan niet in **slecht licht** of schaduwen
- Beweeg je telefoon niet te veel tijdens scannen
- Houd de camera niet te dichtbij of te ver weg
- Scan geen **beschadigde** of **vervaagde** barcodes

## Toekomstige Features

Geplande verbeteringen:
- [ ] Opslaan van favoriete producten
- [ ] Recent gescande producten
- [ ] Offline caching van eerder gescande producten
- [ ] Handmatige barcode invoer (voor als scannen niet werkt)
- [ ] Alternatieve product databases
- [ ] QR-code ondersteuning voor voedingswaarden

## Technische Details

**Dependencies**:
- `html5-qrcode` - Barcode scanning library
- `Open Food Facts API` - Product database

**Browsers**:
- ✅ Chrome/Edge (aanbevolen)
- ✅ Safari (iOS/macOS)
- ✅ Firefox
- ⚠️ Sommige oudere browsers ondersteunen mogelijk geen camera-toegang

**Platforms**:
- ✅ Android (Chrome, Firefox)
- ✅ iOS (Safari, Chrome)
- ✅ Desktop (alle moderne browsers)

## Support

Problemen? Feedback?
- Open een issue op GitHub
- Contact opnemen via de app settings

---

Veel succes met het tracken van je voeding! 💪🥗
