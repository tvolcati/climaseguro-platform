import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ZoneDetailModalProps {
  zone: {
    id: number;
    score: number;
    level: string;
    total_imoveis?: number;
    populacao_estimada?: number;
    coordinates: { lat: number; lon: number };
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ZoneDetailModal = ({ zone, open, onOpenChange }: ZoneDetailModalProps) => {
  if (!zone) return null;

  const getRiskColorClass = (score: number) => {
    if (score >= 70) return "border-red-500 bg-red-50";
    if (score >= 50) return "border-orange-500 bg-orange-50";
    if (score >= 30) return "border-yellow-500 bg-yellow-50";
    return "border-green-500 bg-green-50";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Zona {zone.id} - {zone.level}
          </DialogTitle>
          <DialogDescription>
            Análise detalhada de risco e impacto financeiro
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Score de Risco */}
          <div className={`rounded-lg border-2 p-4 ${getRiskColorClass(zone.score)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Score de Risco</p>
                <p className="text-4xl font-bold">{zone.score}/100</p>
              </div>
              <div className="text-6xl">
                {zone.score >= 70 ? "🔴" : zone.score >= 50 ? "🟠" : zone.score >= 30 ? "🟡" : "🟢"}
              </div>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Imóveis Afetados</p>
              <p className="text-3xl font-bold">{zone.total_imoveis || 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">População Estimada</p>
              <p className="text-3xl font-bold">{zone.populacao_estimada || 0}</p>
            </div>
          </div>

          {/* Imagem de Satélite (placeholder) */}
          <div className="rounded-lg border bg-muted p-8">
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-6xl mb-2">🛰️</div>
              <p className="text-sm text-muted-foreground">
                Imagem de satélite será carregada aqui
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Coordenadas: {zone.coordinates.lat.toFixed(4)}, {zone.coordinates.lon.toFixed(4)}
              </p>
            </div>
          </div>

          {/* Comparação Financeira */}
          <div>
            <h3 className="text-lg font-bold mb-3">💰 Análise Financeira</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Custo Desastre */}
              <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4">
                <h4 className="font-bold text-red-700 mb-2">💥 Custo do Desastre</h4>
                <p className="text-3xl font-bold text-red-900 mb-2">R$ 2,5M</p>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Reconstrução: R$ 1,8M</li>
                  <li>• Perdas humanas: R$ 500K</li>
                  <li>• Infraestrutura: R$ 200K</li>
                </ul>
              </div>

              {/* Custo Prevenção */}
              <div className="rounded-lg border-2 border-green-500 bg-green-50 p-4">
                <h4 className="font-bold text-green-700 mb-2">✅ Custo de Prevenção</h4>
                <p className="text-3xl font-bold text-green-900 mb-2">R$ 250K</p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Drenagem: R$ 120K</li>
                  <li>• Contenção: R$ 80K</li>
                  <li>• Reflorestamento: R$ 50K</li>
                </ul>
              </div>
            </div>

            {/* ROI */}
            <div className="mt-4 rounded-lg bg-blue-100 p-4">
              <p className="text-center text-lg">
                💰 Investir <strong>R$ 1</strong> economiza <strong>R$ 10</strong>
              </p>
              <p className="text-center text-sm text-gray-600 mt-1">
                ROI: 1000% | Economia: R$ 2,25M
              </p>
            </div>
          </div>

          {/* Botão de Ação */}
          <Button className="w-full" size="lg">
            📢 Notificar Prefeitura
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ZoneDetailModal;
