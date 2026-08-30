// Register the Chart.js pieces we use, once.
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

Chart.defaults.color = '#9aa3b5';
Chart.defaults.borderColor = '#2a2f3e';
Chart.defaults.font.family =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const PALETTE = [
  '#6ea8fe', '#5ce0b0', '#f6c177', '#f7768e', '#bb9af7',
  '#7dcfff', '#9ece6a', '#ff9e64', '#e0af68', '#73daca',
  '#c0caf5', '#ad8ee6', '#41a6b5', '#ff757f', '#65bcff',
];
