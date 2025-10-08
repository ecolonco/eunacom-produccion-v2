import React from 'react';
import { CreditPackage, CreditsService } from '../../services/credits.service';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface CreditConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  packageInfo: CreditPackage;
  currentCredits: number;
  isLoading?: boolean;
}

export const CreditConfirmModal: React.FC<CreditConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  packageInfo,
  currentCredits,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const hasEnoughCredits = currentCredits >= packageInfo.cost;
  const remainingCredits = currentCredits - packageInfo.cost;
  const icon = CreditsService.getPackageIcon(packageInfo.type);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Close button */}
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              disabled={isLoading}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${
              hasEnoughCredits ? 'bg-blue-100' : 'bg-red-100'
            } sm:mx-0 sm:h-10 sm:w-10`}>
              {hasEnoughCredits ? (
                <span className="text-2xl">{icon}</span>
              ) : (
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              )}
            </div>

            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {hasEnoughCredits ? 'Confirmar uso de créditos' : 'Créditos insuficientes'}
              </h3>

              {hasEnoughCredits ? (
                <div className="space-y-4">
                  {/* Package info */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      {packageInfo.description}
                    </p>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Ejercicios:</span>
                      <span className="font-semibold">{packageInfo.exercises}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Costo:</span>
                      <span className="font-semibold">{packageInfo.cost} créditos</span>
                    </div>
                    {packageInfo.savings && packageInfo.savings > 0 && (
                      <div className="mt-2 pt-2 border-t border-blue-200">
                        <p className="text-xs text-green-600 font-medium">
                          ✨ {CreditsService.formatSavings(packageInfo)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Balance info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Créditos actuales:</span>
                      <span className="font-semibold text-gray-900">{currentCredits}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Se descontarán:</span>
                      <span className="font-semibold text-red-600">-{packageInfo.cost}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="text-gray-700 font-medium">Créditos restantes:</span>
                      <span className={`font-bold ${
                        remainingCredits < 10 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {remainingCredits}
                      </span>
                    </div>
                  </div>

                  {/* Warning for low balance */}
                  {remainingCredits < 10 && remainingCredits >= 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Te quedarán pocos créditos. Considera comprar más pronto.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-red-800 mb-3">
                      No tienes suficientes créditos para esta acción.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Créditos necesarios:</span>
                        <span className="font-semibold text-gray-900">{packageInfo.cost}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Créditos actuales:</span>
                        <span className="font-semibold text-red-600">{currentCredits}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-red-200">
                        <span className="text-gray-700 font-medium">Te faltan:</span>
                        <span className="font-bold text-red-600">
                          {packageInfo.cost - currentCredits} créditos
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      💡 Contacta con soporte para comprar más créditos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
            {hasEnoughCredits ? (
              <>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                >
                  {isLoading ? 'Procesando...' : 'Confirmar y continuar'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

