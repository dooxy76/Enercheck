import { useState } from "react";
import { Line } from "react-chartjs-2";
import { jsPDF } from "jspdf";
import Tesseract from "tesseract.js";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function EnerCheck() {
  const [prezzoAttuale, setPrezzoAttuale] = useState(0);
  const [consumoAnnuale, setConsumoAnnuale] = useState(0);
  const [spreadSimulato, setSpreadSimulato] = useState(0.0065);
  const [risultato, setRisultato] = useState(null);
  const [file, setFile] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    setFile(file);

    const reader = new FileReader();
    reader.onload = async () => {
      const { data: { text } } = await Tesseract.recognize(
        reader.result,
        'eng',
        { logger: m => console.log(m) }
      );

      const prezzoMatch = text.match(/\d+[\.,]\d+\s*€/);
      const consumoMatch = text.match(/\d+[\.,]\d+\s*kWh/);

      if (prezzoMatch) {
        const prezzo = parseFloat(prezzoMatch[0].replace('€', '').replace(',', '.'));
        setPrezzoAttuale(prezzo);
      }

      if (consumoMatch) {
        const consumo = parseFloat(consumoMatch[0].replace('kWh', '').replace(',', '.'));
        setConsumoAnnuale(consumo);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCalcolo = () => {
    const prezzoPUNmedio = 0.10;
    const prezzoSimulato = prezzoPUNmedio + spreadSimulato;
    const costoAttuale = prezzoAttuale * consumoAnnuale;
    const costoSimulato = prezzoSimulato * consumoAnnuale;
    const risparmio = costoAttuale - costoSimulato;

    setRisultato({
      costoAttuale,
      costoSimulato,
      risparmio,
      prezzoSimulato
    });
  };

  const handlePDFDownload = () => {
    if (!risultato) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("EnerCheck - Consulenze Energetiche", 20, 20);
    doc.setFontSize(12);
    doc.text(`Prezzo attuale: ${prezzoAttuale.toFixed(4)} €/kWh`, 20, 40);
    doc.text(`Consumo annuale: ${consumoAnnuale} kWh`, 20, 50);
    doc.text(`Spread simulato: ${spreadSimulato.toFixed(4)} €/kWh`, 20, 60);
    doc.text(`Costo attuale: ${risultato.costoAttuale.toFixed(2)} €`, 20, 70);
    doc.text(`Costo simulato: ${risultato.costoSimulato.toFixed(2)} €`, 20, 80);
    doc.text(`Risparmio stimato: ${risultato.risparmio.toFixed(2)} €`, 20, 90);

    doc.save("Report_EnerCheck.pdf");
  };

  const datiGrafico = risultato ? {
    labels: [
      "Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
    ],
    datasets: [
      {
        label: "Costo Attuale (€)",
        data: Array(12).fill(risultato.costoAttuale / 12),
        borderColor: "blue",
        backgroundColor: "blue",
      },
      {
        label: "Costo Simulato (€)",
        data: Array(12).fill(risultato.costoSimulato / 12),
        borderColor: "green",
        backgroundColor: "green",
      }
    ]
  } : null;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Simulatore EnerCheck</h1>
      <input type="file" accept="application/pdf" onChange={handleFileUpload} />
      <input type="number" step="0.0001" placeholder="Prezzo attuale €/kWh" value={prezzoAttuale} onChange={(e) => setPrezzoAttuale(parseFloat(e.target.value))} />
      <input type="number" placeholder="Consumo annuale kWh" value={consumoAnnuale} onChange={(e) => setConsumoAnnuale(parseFloat(e.target.value))} />
      <input type="number" step="0.0001" value={spreadSimulato} onChange={(e) => setSpreadSimulato(parseFloat(e.target.value))} />
      <button onClick={handleCalcolo}>Calcola Risparmio</button>
      {risultato && (
        <div className="mt-6 space-y-4">
          <p>Costo attuale: <strong>{risultato.costoAttuale.toFixed(2)} €</strong></p>
          <p>Costo simulato CEA (PUN + Spread): <strong>{risultato.costoSimulato.toFixed(2)} €</strong></p>
          <p>Risparmio stimato: <strong>{risultato.risparmio.toFixed(2)} €</strong></p>
          <button onClick={handlePDFDownload}>Scarica Report PDF</button>
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Simulazione Mensile</h2>
            <Line data={datiGrafico} />
          </div>
        </div>
      )}
    </div>
  );
}
