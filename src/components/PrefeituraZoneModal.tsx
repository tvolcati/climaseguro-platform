import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface Zone {
  zone_id: number;
  level: string;
  coordinates: { lat: number; lon: number };
  total_imoveis: number;
  populacao_estimada: number;
  roi_formatado: string;
  notified_at: string;
}

interface PrefeituraZoneModalProps {
  zone: Zone | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PrefeituraZoneModal = ({ zone, open, onOpenChange }: PrefeituraZoneModalProps) => {
  const navigate = useNavigate();

  if (!zone) return null;

  // Cálculos financeiros
  const custoMedioPorImovel = 15000; // R$ por imóvel
  const custoTotalPrevencao = zone.total_imoveis * custoMedioPorImovel;
  const custoMedioReconstrucao = 180000; // R$ por imóvel
  const custoTotalDesastre = zone.total_imoveis * custoMedioReconstrucao;
  const economiaEstimada = custoTotalDesastre - custoTotalPrevencao;
  const roi = ((economiaEstimada / custoTotalPrevencao) * 100).toFixed(0);

  const handleIniciarProcesso = () => {
    navigate(`/prefeitura/zona/${zone.zone_id}/wizard`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Zona {zone.zone_id} - {zone.level}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da Zona */}
          <Card className="p-4 bg-muted/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Imóveis em Risco</p>
                <p className="text-2xl font-bold">{zone.total_imoveis}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">População Estimada</p>
                <p className="text-2xl font-bold">{zone.populacao_estimada}</p>
              </div>
            </div>
          </Card>

          {/* Memorial de Cálculo */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">💰 Memorial de Cálculo Financeiro</h3>
            
            {/* Custos de Prevenção */}
            <Card className="p-4 border-blue-200 bg-blue-50">
              <h4 className="font-semibold text-blue-900 mb-3">Custos de Prevenção</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Custo médio por imóvel:</span>
                  <span className="font-medium">R$ {custoMedioPorImovel.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Número de imóveis:</span>
                  <span className="font-medium">× {zone.total_imoveis}</span>
                </div>
                <div className="border-t border-blue-300 pt-2 mt-2"></div>
                <div className="flex justify-between text-base">
                  <span className="font-semibold text-blue-900">Total Prevenção:</span>
                  <span className="font-bold text-blue-900">R$ {custoTotalPrevencao.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </Card>

            {/* Custos de Desastre */}
            <Card className="p-4 border-red-200 bg-red-50">
              <h4 className="font-semibold text-red-900 mb-3">Custos Estimados de Desastre</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-red-700">Custo médio reconstrução por imóvel:</span>
                  <span className="font-medium">R$ {custoMedioReconstrucao.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700">Número de imóveis:</span>
                  <span className="font-medium">× {zone.total_imoveis}</span>
                </div>
                <div className="border-t border-red-300 pt-2 mt-2"></div>
                <div className="flex justify-between text-base">
                  <span className="font-semibold text-red-900">Total Desastre:</span>
                  <span className="font-bold text-red-900">R$ {custoTotalDesastre.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </Card>

            {/* Economia e ROI */}
            <Card className="p-4 border-green-200 bg-green-50">
              <h4 className="font-semibold text-green-900 mb-3">Retorno do Investimento</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Economia estimada:</span>
                  <span className="font-medium">R$ {economiaEstimada.toLocaleString('pt-BR')}</span>
                </div>
                <div className="border-t border-green-300 pt-2 mt-2"></div>
                <div className="flex justify-between text-lg">
                  <span className="font-semibold text-green-900">ROI:</span>
                  <span className="font-bold text-green-900 text-2xl">{roi}%</span>
                </div>
                <p className="text-xs text-green-700 mt-2">
                  A cada R$ 1,00 investido em prevenção, economiza-se R$ {(parseFloat(roi) / 100 + 1).toFixed(2)} em reconstrução
                </p>
              </div>
            </Card>
          </div>

          {/* Metodologia */}
          <Card className="p-4 bg-muted/30">
            <h4 className="font-semibold mb-2 text-sm">📋 Metodologia de Cálculo</h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Custos baseados em dados históricos da Defesa Civil</li>
              <li>• Valores incluem: obras de contenção, drenagem e relocação</li>
              <li>• Reconstrução: custos médios de reparos estruturais + custos sociais</li>
              <li>• População estimada: média de 3,2 pessoas por imóvel (IBGE)</li>
            </ul>
          </Card>

          {/* Botão de Ação */}
          <Button 
            onClick={handleIniciarProcesso}
            size="lg" 
            className="w-full"
          >
            🚀 Iniciar Processo de Prevenção
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrefeituraZoneModal;
