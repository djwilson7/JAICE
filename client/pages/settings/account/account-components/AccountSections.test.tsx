import React from 'react';
import { render, screen } from '@testing-library/react';
import { Row, RowItem } from './AccountSections';

describe('AccountSections', () => {
  it('renders Row component with children', () => {
    render(<Row><div>Test Child</div></Row>);
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('renders Row component with error', () => {
    render(<Row rowError="Error message"><div>Test Child</div></Row>);
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders RowItem component with children', () => {
    render(<RowItem><div>Row Item Child</div></RowItem>);
    expect(screen.getByText('Row Item Child')).toBeInTheDocument();
  });
});
